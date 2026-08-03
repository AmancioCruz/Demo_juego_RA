<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import BotonApp from '@/componentes/interfaz/BotonApp.vue'

const props = defineProps({
  sticker: { type: Object, required: true },
})

const contenedorRef = ref(null)
const videoRef = ref(null)
const camaraActiva = ref(false)
const cargandoCamara = ref(false)
const mensaje = ref('')
const pista = ref('Mueve la camara despacio para detectar un plano.')
const encontrados = ref(0)
const meta = 3
const objetivoRenato = ref(null)
const puedePedirMovimiento = ref(false)
const superficieDetectada = ref(false)
const nombreSuperficie = ref('superficie firme')
const progresoMapeo = ref(0)
const puntosMapeo = ref([])

let escena
let camara
let renderizador
let modeloRenato
let animacionId
let flujoCamara
let intervaloMapeo
let posicionObjetivo = new THREE.Vector3()
let vistaX = 0
let vistaY = 0
let baseGamma
let baseBeta
let arrastrando = false
let puntoArrastre = { x: 0, y: 0 }
const alturaSuperficie = -1.72
const alturaObjetivoTactil = 0.72
const ajusteApoyoRenato = -0.1

function prepararModelo(modelo) {
  modelo.traverse((objeto) => {
    if (objeto.isMesh) {
      objeto.frustumCulled = false
      objeto.castShadow = true
      if (!objeto.material || objeto.material.name === 'DefaultMaterial') {
        objeto.material = new THREE.MeshStandardMaterial({
          color: '#0057a8',
          roughness: 0.42,
        })
      }
    }
  })

  const caja = new THREE.Box3().setFromObject(modelo)
  const centro = new THREE.Vector3()
  const tamano = new THREE.Vector3()
  caja.getCenter(centro)
  caja.getSize(tamano)

  const dimensionMayor = Math.max(tamano.x, tamano.y, tamano.z) || 1
  const escala = 1.12 / dimensionMayor
  modelo.scale.setScalar(escala)
  modelo.position.set(0, 0, 0)
  modelo.updateWorldMatrix(true, true)

  const cajaEscalada = new THREE.Box3().setFromObject(modelo)
  const centroEscalado = new THREE.Vector3()
  cajaEscalada.getCenter(centroEscalado)
  modelo.position.set(
    -centroEscalado.x,
    -cajaEscalada.min.y + ajusteApoyoRenato,
    -centroEscalado.z,
  )
  modelo.rotation.y = -0.25
  return modelo
}

function crearSombraSuperficie() {
  const geometria = new THREE.CircleGeometry(0.58, 40)
  const material = new THREE.MeshBasicMaterial({
    color: '#0b2745',
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  })
  const sombra = new THREE.Mesh(geometria, material)
  sombra.scale.set(1, 0.26, 1)
  sombra.position.set(0, -0.03, -0.02)
  return sombra
}

function cargarModeloRenato() {
  const cargador = new GLTFLoader()
  cargador.load(
    props.sticker.modeloVista3d,
    (gltf) => {
      const grupo = new THREE.Group()
      grupo.add(crearSombraSuperficie())
      grupo.add(prepararModelo(gltf.scene))
      modeloRenato = grupo
      modeloRenato.visible = false
      escena.add(modeloRenato)
      colocarRenatoEnPlano()
      mensaje.value = ''
    },
    (evento) => {
      if (!evento.total) return
      const avance = Math.round((evento.loaded / evento.total) * 100)
      mensaje.value = `Cargando Renato ${avance}%`
    },
    () => {
      mensaje.value = `No se pudo cargar Renato desde ${props.sticker.modeloVista3d}.`
    },
  )
}

function iniciarDeteccionSuperficie() {
  if (superficieDetectada.value || intervaloMapeo) return

  pista.value = 'Mapeando el espacio. Mueve la camara despacio.'
  progresoMapeo.value = 0
  puntosMapeo.value = []

  intervaloMapeo = window.setInterval(() => {
    progresoMapeo.value = Math.min(100, progresoMapeo.value + THREE.MathUtils.randInt(9, 16))
    agregarPuntosMapeo()

    if (progresoMapeo.value < 100) return

    window.clearInterval(intervaloMapeo)
    intervaloMapeo = undefined
    const superficies = ['suelo', 'mesa', 'silla']
    nombreSuperficie.value = superficies[Math.floor(Math.random() * superficies.length)]
    superficieDetectada.value = true
    vistaX = 0
    vistaY = 0
    pista.value = `Plano firme detectado: ${nombreSuperficie.value}. Renato se coloco ahi.`
    colocarRenatoEnPlano()
  }, 220)
}

function agregarPuntosMapeo() {
  const filas = 6
  const columnas = 8
  const totalVisible = Math.ceil((progresoMapeo.value / 100) * filas * columnas)
  const nuevosPuntos = []

  for (let fila = 0; fila < filas; fila += 1) {
    const progresoFila = fila / (filas - 1)
    const anchoFila = THREE.MathUtils.lerp(38, 78, progresoFila)
    const inicioX = 50 - anchoFila / 2
    const y = THREE.MathUtils.lerp(49, 78, progresoFila)

    for (let columna = 0; columna < columnas; columna += 1) {
      if (nuevosPuntos.length >= totalVisible) break
      const progresoColumna = columna / (columnas - 1)
      nuevosPuntos.push({
        id: `${fila}-${columna}`,
        izquierda: `${inicioX + anchoFila * progresoColumna + THREE.MathUtils.randFloat(-1.2, 1.2)}%`,
        arriba: `${y + THREE.MathUtils.randFloat(-0.8, 0.8)}%`,
        tamano: `${THREE.MathUtils.lerp(4.5, 8, progresoFila)}px`,
        retraso: `${(fila + columna) * 0.035}s`,
      })
    }
  }

  puntosMapeo.value = nuevosPuntos
}

function colocarRenatoEnPlano() {
  if (!modeloRenato || encontrados.value >= meta) return
  if (!superficieDetectada.value) {
    iniciarDeteccionSuperficie()
    return
  }
  posicionObjetivo.set(0, alturaSuperficie, 0)
  modeloRenato.position.set(posicionObjetivo.x, posicionObjetivo.y, posicionObjetivo.z)
  modeloRenato.rotation.y = -0.25
  modeloRenato.visible = true
  actualizarObjetivoTactil()
}

function actualizarCamaraVirtual() {
  if (!camara) return
  if (superficieDetectada.value) {
    camara.position.set(0, 0, 5)
    camara.lookAt(0, 0, 0)
    return
  }
  camara.position.x = vistaX
  camara.position.y = vistaY
  camara.lookAt(vistaX, vistaY, 0)
}

function actualizarObjetivoTactil() {
  if (!modeloRenato || !camara || !contenedorRef.value || !modeloRenato.visible) {
    objetivoRenato.value = null
    return
  }

  const posicion = new THREE.Vector3()
  modeloRenato.getWorldPosition(posicion)
  posicion.y += alturaObjetivoTactil
  posicion.project(camara)

  const distanciaCentro = Math.hypot(posicion.x, posicion.y)
  const visible = posicion.z > -1 && posicion.z < 1 && distanciaCentro < 1.05

  objetivoRenato.value = {
    izquierda: `${((posicion.x + 1) / 2) * 100}%`,
    arriba: `${((-posicion.y + 1) / 2) * 100}%`,
    visible,
  }

  if (visible) {
    pista.value = 'Renato esta cerca. Tocalo para encontrarlo.'
    return
  }

  const direccionHorizontal =
    posicion.x > 0.18 ? 'a la derecha' : posicion.x < -0.18 ? 'a la izquierda' : ''
  const direccionVertical = posicion.y > 0.18 ? 'arriba' : posicion.y < -0.18 ? 'abajo' : ''
  const direccion = [direccionHorizontal, direccionVertical].filter(Boolean).join(' y ')
  pista.value = direccion ? `Busca ${direccion}.` : 'Mueve un poco la camara.'
}

function encontrarRenato() {
  if (!objetivoRenato.value?.visible || encontrados.value >= meta) return
  encontrados.value += 1
  if (encontrados.value >= meta) {
    modeloRenato.visible = false
    objetivoRenato.value = null
    pista.value = 'Encontraste a Renato.'
    return
  }
  pista.value = 'Bien. Renato se escondio otra vez.'
  modeloRenato.visible = false
  objetivoRenato.value = null
  setTimeout(() => colocarRenatoEnPlano(), 420)
}

function iniciarEscena() {
  const ancho = contenedorRef.value.clientWidth
  const alto = contenedorRef.value.clientHeight

  escena = new THREE.Scene()
  camara = new THREE.PerspectiveCamera(45, ancho / alto, 0.1, 100)
  camara.position.set(0, 0, 5)

  renderizador = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderizador.setSize(ancho, alto)
  renderizador.domElement.style.position = 'absolute'
  renderizador.domElement.style.inset = '0'
  renderizador.domElement.style.zIndex = '4'
  renderizador.domElement.style.width = '100%'
  renderizador.domElement.style.height = '100%'
  renderizador.domElement.style.pointerEvents = 'none'
  contenedorRef.value.appendChild(renderizador.domElement)

  escena.add(new THREE.HemisphereLight('#ffffff', '#abc7df', 2.25))
  const luz = new THREE.DirectionalLight('#ffffff', 2.7)
  luz.position.set(3, 4, 5)
  escena.add(luz)

  cargarModeloRenato()
  animar()
}

function animar() {
  animacionId = requestAnimationFrame(animar)
  actualizarCamaraVirtual()
  actualizarObjetivoTactil()
  renderizador.render(escena, camara)
}

function ajustarTamano() {
  if (!contenedorRef.value || !renderizador || !camara) return
  const ancho = contenedorRef.value.clientWidth
  const alto = contenedorRef.value.clientHeight
  camara.aspect = ancho / alto
  camara.updateProjectionMatrix()
  renderizador.setSize(ancho, alto)
}

async function activarCamara() {
  if (cargandoCamara.value || camaraActiva.value) return

  if (!navigator.mediaDevices?.getUserMedia) {
    mensaje.value = 'Este navegador no permite abrir la camara.'
    return
  }

  cargandoCamara.value = true
  try {
    await nextTick()
    try {
      flujoCamara = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
    } catch {
      flujoCamara = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    }

    videoRef.value.srcObject = flujoCamara
    await videoRef.value.play()
    camaraActiva.value = true
    iniciarDeteccionSuperficie()
  } catch {
    mensaje.value = 'No se pudo abrir la camara. Revisa permisos o usa localhost/HTTPS.'
  } finally {
    cargandoCamara.value = false
  }
}

function detenerCamara() {
  flujoCamara?.getTracks().forEach((track) => track.stop())
  flujoCamara = null
  camaraActiva.value = false
}

function manejarOrientacion(evento) {
  if (typeof evento.gamma !== 'number' || typeof evento.beta !== 'number') return
  if (baseGamma === undefined) baseGamma = evento.gamma
  if (baseBeta === undefined) baseBeta = evento.beta

  vistaX = THREE.MathUtils.clamp((evento.gamma - baseGamma) * 0.075, -3, 3)
  vistaY = THREE.MathUtils.clamp((baseBeta - evento.beta) * 0.055, -2.25, 2.25)
}

async function pedirMovimiento() {
  if (typeof DeviceOrientationEvent?.requestPermission !== 'function') return
  const permiso = await DeviceOrientationEvent.requestPermission()
  if (permiso === 'granted') {
    puedePedirMovimiento.value = false
    window.addEventListener('deviceorientation', manejarOrientacion)
  }
}

function iniciarArrastre(evento) {
  arrastrando = true
  puntoArrastre = { x: evento.clientX, y: evento.clientY }
}

function moverVista(evento) {
  if (!arrastrando) return
  const dx = evento.clientX - puntoArrastre.x
  const dy = evento.clientY - puntoArrastre.y
  vistaX = THREE.MathUtils.clamp(vistaX - dx * 0.012, -3, 3)
  vistaY = THREE.MathUtils.clamp(vistaY + dy * 0.012, -2.25, 2.25)
  puntoArrastre = { x: evento.clientX, y: evento.clientY }
}

function terminarArrastre() {
  arrastrando = false
}

function reiniciar() {
  encontrados.value = 0
  vistaX = 0
  vistaY = 0
  baseGamma = undefined
  baseBeta = undefined
  pista.value = superficieDetectada.value
    ? `Plano firme detectado: ${nombreSuperficie.value}. Renato se coloco ahi.`
    : 'Mueve la camara despacio para detectar un plano.'
  colocarRenatoEnPlano()
}

onMounted(() => {
  iniciarEscena()
  window.addEventListener('resize', ajustarTamano)
  window.addEventListener('pointerup', terminarArrastre)

  if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
    puedePedirMovimiento.value = true
  } else {
    window.addEventListener('deviceorientation', manejarOrientacion)
  }

  requestAnimationFrame(() => activarCamara())
})

onBeforeUnmount(() => {
  detenerCamara()
  window.removeEventListener('resize', ajustarTamano)
  window.removeEventListener('pointerup', terminarArrastre)
  window.removeEventListener('deviceorientation', manejarOrientacion)
  window.clearInterval(intervaloMapeo)
  cancelAnimationFrame(animacionId)
  renderizador?.dispose()
  renderizador?.domElement?.remove()
})
</script>

<template>
  <section class="juego-renato">
    <div class="panel-puntaje">
      <strong>{{ encontrados }}/{{ meta }}</strong>
      <span>Renatos encontrados</span>
      <BotonApp variante="secundario" @click="reiniciar">Reiniciar</BotonApp>
    </div>

    <div
      ref="contenedorRef"
      class="escena-renato"
      @pointerdown="iniciarArrastre"
      @pointermove="moverVista"
      @pointerleave="terminarArrastre"
    >
      <video
        ref="videoRef"
        class="video-camara"
        :class="{ 'video-camara--activa': camaraActiva }"
        autoplay
        muted
        playsinline
      ></video>

      <div v-if="!camaraActiva" class="fondo-prueba">
        <span>RA</span>
        <p>{{ cargandoCamara ? 'Abriendo camara...' : 'Activa la camara para buscar a Renato.' }}</p>
      </div>

      <div class="mira-centro" aria-hidden="true"></div>

      <div v-if="camaraActiva" class="capa-mapeo" aria-hidden="true">
        <span
          v-for="punto in puntosMapeo"
          :key="punto.id"
          class="punto-mapeo"
          :style="{
            left: punto.izquierda,
            top: punto.arriba,
            width: punto.tamano,
            height: punto.tamano,
            animationDelay: punto.retraso,
          }"
        ></span>
      </div>

      <div v-if="camaraActiva && superficieDetectada" class="superficie-visual" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div v-if="camaraActiva" class="superficie-indicador">
        <span :class="{ 'superficie-indicador__punto--activo': superficieDetectada }"></span>
        {{
          superficieDetectada
            ? `Plano detectado: ${nombreSuperficie}`
            : `Mapeando espacio ${progresoMapeo}%`
        }}
      </div>

      <button
        v-if="objetivoRenato?.visible && encontrados < meta"
        type="button"
        class="objetivo-renato"
        :style="{ left: objetivoRenato.izquierda, top: objetivoRenato.arriba }"
        aria-label="Encontrar a Renato"
        @click.stop="encontrarRenato"
        @touchstart.stop.prevent="encontrarRenato"
      >
        <span>Renato</span>
      </button>

      <div class="guia-control">
        <p>{{ pista }}</p>
        <BotonApp v-if="puedePedirMovimiento" variante="secundario" @click="pedirMovimiento">
          Activar movimiento
        </BotonApp>
      </div>

      <div v-if="encontrados >= meta" class="panel-completado">
        <span>3/3</span>
        <h3>Reto completado</h3>
        <p>Encontraste a Renato en la camara.</p>
        <BotonApp variante="secundario" @click.stop="reiniciar">Jugar otra vez</BotonApp>
      </div>
    </div>

    <p v-if="mensaje" class="mensaje-juego">{{ mensaje }}</p>

    <BotonApp v-if="!camaraActiva" bloque :disabled="cargandoCamara" @click="activarCamara">
      {{ cargandoCamara ? 'Abriendo camara...' : 'Activar camara' }}
    </BotonApp>
  </section>
</template>

<style scoped>
.juego-renato {
  display: grid;
  gap: 14px;
}

.panel-puntaje {
  padding: 14px;
  border: 1px solid var(--borde);
  border-radius: 18px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  background: #fff;
  box-shadow: var(--sombra);
}

.panel-puntaje strong {
  color: var(--rojo);
  font-size: 1.25rem;
}

.panel-puntaje span {
  color: var(--texto-suave);
  font-size: 0.82rem;
  font-weight: 900;
}

.escena-renato {
  position: relative;
  min-height: 500px;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(circle at 78% 18%, rgba(215, 25, 32, 0.28), transparent 24%),
    linear-gradient(145deg, #102f53, #06345f);
  box-shadow: var(--sombra);
  touch-action: none;
}

.video-camara {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  pointer-events: none;
}

.video-camara--activa {
  opacity: 1;
}

.fondo-prueba {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-content: center;
  justify-items: center;
  color: #fff;
  text-align: center;
  pointer-events: none;
}

.fondo-prueba span {
  width: 76px;
  height: 76px;
  margin-bottom: 12px;
  border-radius: 22px;
  display: grid;
  place-items: center;
  background: var(--rojo);
  font-size: 1.35rem;
  font-weight: 900;
}

.fondo-prueba p {
  max-width: 260px;
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  font-weight: 800;
  line-height: 1.35;
}

.mira-centro {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 6;
  width: 58px;
  height: 58px;
  border: 2px solid rgba(255, 255, 255, 0.72);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.mira-centro::before,
.mira-centro::after {
  position: absolute;
  content: '';
  background: rgba(255, 255, 255, 0.72);
}

.mira-centro::before {
  top: 50%;
  right: 12px;
  left: 12px;
  height: 2px;
  transform: translateY(-50%);
}

.mira-centro::after {
  top: 12px;
  bottom: 12px;
  left: 50%;
  width: 2px;
  transform: translateX(-50%);
}

.capa-mapeo {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  pointer-events: none;
}

.punto-mapeo {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 213, 79, 0.92);
  box-shadow:
    0 0 0 4px rgba(255, 213, 79, 0.16),
    0 0 18px rgba(255, 255, 255, 0.45);
  animation: pulso-mapeo 1.35s ease-in-out infinite;
}

.superficie-visual {
  position: absolute;
  right: 10%;
  bottom: 76px;
  left: 10%;
  z-index: 3;
  height: 92px;
  border-radius: 50%;
  background:
    linear-gradient(90deg, rgba(255, 213, 79, 0.22) 1px, transparent 1px),
    linear-gradient(0deg, rgba(255, 213, 79, 0.22) 1px, transparent 1px),
    radial-gradient(ellipse at center, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.08) 54%, transparent 74%),
    radial-gradient(ellipse at center, rgba(6, 35, 64, 0.32), transparent 66%);
  background-size:
    28px 28px,
    28px 28px,
    100% 100%,
    100% 100%;
  border: 1px solid rgba(255, 255, 255, 0.28);
  transform: perspective(280px) rotateX(58deg);
  transform-origin: center bottom;
  pointer-events: none;
  box-shadow: 0 0 34px rgba(255, 213, 79, 0.18);
}

.superficie-visual::after {
  position: absolute;
  right: 22%;
  bottom: 26px;
  left: 22%;
  height: 5px;
  border-radius: 999px;
  background: rgba(6, 35, 64, 0.26);
  content: '';
  filter: blur(2px);
}

.superficie-visual span {
  position: absolute;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 16px rgba(255, 213, 79, 0.72);
}

.superficie-visual span:nth-child(1) {
  top: 32%;
  left: 22%;
}

.superficie-visual span:nth-child(2) {
  top: 54%;
  left: 52%;
}

.superficie-visual span:nth-child(3) {
  top: 38%;
  right: 18%;
}

.superficie-indicador {
  position: absolute;
  top: 14px;
  left: 14px;
  z-index: 8;
  max-width: calc(100% - 28px);
  padding: 9px 12px;
  border-radius: 999px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: var(--azul);
  background: rgba(255, 255, 255, 0.9);
  font-size: 0.78rem;
  font-weight: 900;
  backdrop-filter: blur(14px);
  box-shadow: 0 12px 30px rgba(6, 35, 64, 0.18);
}

.superficie-indicador span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--amarillo);
  box-shadow: 0 0 0 5px rgba(255, 213, 79, 0.22);
}

.superficie-indicador__punto--activo {
  background: var(--verde, #1fbf75) !important;
  box-shadow: 0 0 0 5px rgba(31, 191, 117, 0.2) !important;
}

.objetivo-renato {
  position: absolute;
  z-index: 7;
  width: 128px;
  height: 128px;
  border: 2px solid rgba(255, 255, 255, 0.78);
  border-radius: 50%;
  display: grid;
  place-items: end center;
  padding-bottom: 8px;
  color: #fff;
  background: rgba(215, 25, 32, 0.08);
  box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.1);
  transform: translate(-50%, -50%);
}

.objetivo-renato span {
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(16, 47, 83, 0.7);
  font-size: 0.72rem;
  font-weight: 900;
  backdrop-filter: blur(10px);
}

.objetivo-renato:active {
  background: rgba(215, 25, 32, 0.3);
}

.guia-control {
  position: absolute;
  right: 14px;
  bottom: 10px;
  left: 14px;
  z-index: 8;
  padding: 10px 12px;
  border-radius: 18px;
  display: grid;
  gap: 10px;
  color: var(--azul);
  background: rgba(255, 255, 255, 0.88);
  text-align: center;
  backdrop-filter: blur(14px);
}

.guia-control p {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 900;
}

.panel-completado {
  position: absolute;
  inset: 0;
  z-index: 9;
  padding: 28px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 10px;
  background: rgba(6, 35, 64, 0.76);
  color: #fff;
  text-align: center;
}

.panel-completado span {
  width: 74px;
  height: 74px;
  border-radius: 24px;
  display: grid;
  place-items: center;
  background: var(--amarillo);
  color: var(--azul);
  font-size: 1.05rem;
  font-weight: 950;
}

.panel-completado h3,
.panel-completado p {
  margin: 0;
}

.panel-completado h3 {
  font-size: 1.55rem;
}

.panel-completado p {
  max-width: 260px;
  color: rgba(255, 255, 255, 0.82);
  font-weight: 800;
  line-height: 1.35;
}

.mensaje-juego {
  margin: 0;
  padding: 12px;
  border-radius: 14px;
  color: var(--azul);
  background: var(--azul-claro);
  font-size: 0.85rem;
  font-weight: 900;
}

@keyframes pulso-mapeo {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.82);
  }

  50% {
    opacity: 1;
    transform: scale(1.12);
  }
}
</style>
