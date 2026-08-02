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
const pista = ref('Mueve la camara para buscar a Renato.')
const encontrados = ref(0)
const meta = 3
const objetivoRenato = ref(null)
const puedePedirMovimiento = ref(false)

let escena
let camara
let renderizador
let modeloRenato
let animacionId
let flujoCamara
let posicionObjetivo = new THREE.Vector3()
let vistaX = 0
let vistaY = 0
let baseGamma
let baseBeta
let arrastrando = false
let puntoArrastre = { x: 0, y: 0 }

function crearRenatoRespaldo() {
  const grupo = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({ color: '#0057a8', roughness: 0.38 })
  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.86, 8, 18), material)
  const cabeza = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 24, 24),
    new THREE.MeshStandardMaterial({ color: '#f0c7a3', roughness: 0.42 }),
  )
  cabeza.position.y = 0.82
  grupo.add(cuerpo, cabeza)
  return grupo
}

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
  const escala = 1.15 / dimensionMayor
  modelo.scale.setScalar(escala)
  modelo.position.set(-centro.x * escala, -centro.y * escala, -centro.z * escala)
  modelo.rotation.y = -0.25
  return modelo
}

function cargarModeloRenato() {
  const cargador = new GLTFLoader()
  cargador.load(
    props.sticker.modeloVista3d,
    (gltf) => {
      modeloRenato = prepararModelo(gltf.scene)
      modeloRenato.visible = false
      escena.add(modeloRenato)
      esconderRenato()
      mensaje.value = ''
    },
    (evento) => {
      if (!evento.total) return
      const avance = Math.round((evento.loaded / evento.total) * 100)
      mensaje.value = `Cargando Renato ${avance}%`
    },
    () => {
      modeloRenato = crearRenatoRespaldo()
      modeloRenato.visible = false
      escena.add(modeloRenato)
      esconderRenato()
      mensaje.value = `No se pudo cargar Renato desde ${props.sticker.modeloVista3d}.`
    },
  )
}

function esconderRenato() {
  if (!modeloRenato || encontrados.value >= meta) return
  const lejosDelCentro = THREE.MathUtils.randFloat(1.15, 2.75)
  const direccionX = Math.random() > 0.5 ? 1 : -1
  const direccionY = Math.random() > 0.5 ? 1 : -1
  posicionObjetivo.set(
    lejosDelCentro * direccionX,
    THREE.MathUtils.randFloat(0.15, 1.85) * direccionY,
    THREE.MathUtils.randFloat(-0.35, 0.55),
  )
  modeloRenato.position.set(posicionObjetivo.x, posicionObjetivo.y, posicionObjetivo.z)
  modeloRenato.visible = true
  actualizarObjetivoTactil()
}

function actualizarCamaraVirtual() {
  if (!camara) return
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
  posicion.project(camara)

  const distanciaCentro = Math.hypot(posicion.x, posicion.y)
  const visible = posicion.z > -1 && posicion.z < 1 && distanciaCentro < 0.72

  objetivoRenato.value = {
    izquierda: `${((posicion.x + 1) / 2) * 100}%`,
    arriba: `${((-posicion.y + 1) / 2) * 100}%`,
    visible,
  }

  pista.value = visible ? 'Renato esta cerca. Tocalo para encontrarlo.' : 'Mueve la camara para buscar a Renato.'
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
  esconderRenato()
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
  if (modeloRenato?.visible) modeloRenato.rotation.y += 0.008
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
  esconderRenato()
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

      <button
        v-if="objetivoRenato?.visible && encontrados < meta"
        type="button"
        class="objetivo-renato"
        :style="{ left: objetivoRenato.izquierda, top: objetivoRenato.arriba }"
        aria-label="Encontrar a Renato"
        @click.stop="encontrarRenato"
        @touchstart.stop.prevent="encontrarRenato"
      ></button>

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

.objetivo-renato {
  position: absolute;
  z-index: 7;
  width: 120px;
  height: 120px;
  border: 2px solid rgba(255, 255, 255, 0.68);
  border-radius: 50%;
  background: rgba(215, 25, 32, 0.12);
  transform: translate(-50%, -50%);
}

.objetivo-renato:active {
  background: rgba(215, 25, 32, 0.3);
}

.guia-control {
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  z-index: 8;
  padding: 12px;
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
</style>
