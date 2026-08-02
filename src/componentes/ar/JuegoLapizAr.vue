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
const puntaje = ref(0)
const camaraActiva = ref(false)
const cargandoCamara = ref(false)
const mensaje = ref('')
const metaLapices = 20
const objetivosLapices = ref([])

let escena
let camara
let renderizador
let modeloBase
let animacionId
let flujoCamara
let ultimoTiempo = 0
let lapices = []
let ultimoIdLapiz = 0

function crearLapizRespaldo() {
  const grupo = new THREE.Group()
  const cuerpo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.25, 16),
    new THREE.MeshStandardMaterial({ color: props.sticker.colorModelo, roughness: 0.35 }),
  )
  const punta = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.28, 16),
    new THREE.MeshStandardMaterial({ color: '#d8a15f', roughness: 0.45 }),
  )
  cuerpo.rotation.z = Math.PI / 2
  punta.rotation.z = -Math.PI / 2
  punta.position.x = 0.74
  grupo.add(cuerpo, punta)
  return grupo
}

function prepararModelo(modelo) {
  modelo.traverse((objeto) => {
    if (objeto.isMesh) {
      objeto.castShadow = true
      objeto.frustumCulled = false
    }
  })

  const caja = new THREE.Box3().setFromObject(modelo)
  const centro = new THREE.Vector3()
  const tamano = new THREE.Vector3()
  caja.getCenter(centro)
  caja.getSize(tamano)

  const dimensionMayor = Math.max(tamano.x, tamano.y, tamano.z) || 1
  const escala = 1.4 / dimensionMayor
  modelo.scale.setScalar(escala)
  modelo.position.set(-centro.x * escala, -centro.y * escala, -centro.z * escala)

  return modelo
}

function cargarModeloLapiz() {
  const cargador = new GLTFLoader()
  cargador.load(
    props.sticker.modelo3d,
    (gltf) => {
      modeloBase = prepararModelo(gltf.scene)
      mensaje.value = ''
    },
    undefined,
    () => {
      modeloBase = crearLapizRespaldo()
      mensaje.value = `No se pudo cargar el GLB del lapiz desde ${props.sticker.modelo3d}.`
    },
  )
}

function crearLapizCayendo() {
  if (!modeloBase) return
  const lapiz = modeloBase.clone(true)
  const x = THREE.MathUtils.randFloat(-2.1, 2.1)
  const y = THREE.MathUtils.randFloat(1.15, 2.85)
  const z = THREE.MathUtils.randFloat(-0.25, 0.75)
  lapiz.position.set(x, y, z)
  lapiz.rotation.set(
    THREE.MathUtils.randFloat(-0.4, 0.4),
    THREE.MathUtils.randFloat(0, Math.PI),
    THREE.MathUtils.randFloat(-0.8, 0.8),
  )
  lapiz.scale.multiplyScalar(0.78)
  escena.add(lapiz)
  lapices.push({
    id: ultimoIdLapiz,
    objeto: lapiz,
    velocidadCaida: THREE.MathUtils.randFloat(0.65, 1.05),
    velocidadRotacion: THREE.MathUtils.randFloat(0.7, 1.5),
  })
  ultimoIdLapiz += 1
}

function limpiarLapiz(indice) {
  const lapiz = lapices[indice]
  escena.remove(lapiz.objeto)
  lapices.splice(indice, 1)
  actualizarObjetivosTactiles()
}

function actualizarObjetivosTactiles() {
  if (!camara || !lapices.length || puntaje.value >= metaLapices) {
    objetivosLapices.value = []
    return
  }

  objetivosLapices.value = lapices.map((lapiz) => {
    const posicion = new THREE.Vector3()
    lapiz.objeto.getWorldPosition(posicion)
    posicion.project(camara)

    return {
      id: lapiz.id,
      izquierda: `${((posicion.x + 1) / 2) * 100}%`,
      arriba: `${((-posicion.y + 1) / 2) * 100}%`,
      visible: posicion.z > -1 && posicion.z < 1 && posicion.y > -1.2 && posicion.y < 1.2,
    }
  })
}

function mantenerLapicesEnPantalla() {
  if (!camaraActiva.value || !modeloBase || puntaje.value >= metaLapices) return
  while (lapices.length < 9) crearLapizCayendo()
}

function actualizarLapices(delta) {
  if (puntaje.value >= metaLapices) return
  mantenerLapicesEnPantalla()
  for (let indice = lapices.length - 1; indice >= 0; indice -= 1) {
    const lapiz = lapices[indice]
    lapiz.objeto.position.y -= lapiz.velocidadCaida * delta
    lapiz.objeto.rotation.y += delta * lapiz.velocidadRotacion
    lapiz.objeto.rotation.z += delta * 0.65
    lapiz.objeto.position.x += Math.sin(ultimoTiempo * 0.001 + lapiz.id) * delta * 0.12

    if (lapiz.objeto.position.y < -3.25) {
      limpiarLapiz(indice)
    }
  }
  mantenerLapicesEnPantalla()
  actualizarObjetivosTactiles()
}

function iniciarEscena() {
  const ancho = contenedorRef.value.clientWidth
  const alto = contenedorRef.value.clientHeight

  escena = new THREE.Scene()
  camara = new THREE.PerspectiveCamera(45, ancho / alto, 0.1, 100)
  camara.position.set(0, 0, 6)

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

  escena.add(new THREE.HemisphereLight('#ffffff', '#abc7df', 2.1))
  const luz = new THREE.DirectionalLight('#ffffff', 2.5)
  luz.position.set(3, 4, 5)
  escena.add(luz)

  cargarModeloLapiz()
  animar(0)
}

function animar(tiempo) {
  animacionId = requestAnimationFrame(animar)
  const delta = Math.min(0.033, (tiempo - ultimoTiempo) / 1000 || 0)
  ultimoTiempo = tiempo
  actualizarLapices(delta)
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
    if (!videoRef.value) {
      mensaje.value = 'La vista de camara aun no esta lista. Intenta de nuevo.'
      return
    }

    try {
      flujoCamara = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
    } catch {
      flujoCamara = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      })
    }

    videoRef.value.srcObject = flujoCamara
    await videoRef.value.play()
    camaraActiva.value = true
    mensaje.value = ''
    mantenerLapicesEnPantalla()
  } catch {
    mensaje.value =
      'No se pudo abrir la camara. Revisa permisos o usa localhost/HTTPS. El juego sigue en modo prueba.'
  } finally {
    cargandoCamara.value = false
  }
}

function detenerCamara() {
  flujoCamara?.getTracks().forEach((track) => track.stop())
  flujoCamara = null
  camaraActiva.value = false
}

function tocarLapiz(idLapiz) {
  if (!camaraActiva.value || puntaje.value >= metaLapices) return
  const indice = lapices.findIndex((lapiz) => lapiz.id === idLapiz)
  if (indice === -1) return

  puntaje.value = Math.min(puntaje.value + 1, metaLapices)
  limpiarLapiz(indice)
  mantenerLapicesEnPantalla()
}

function reiniciar() {
  puntaje.value = 0
  lapices.forEach((lapiz) => escena.remove(lapiz.objeto))
  lapices = []
  objetivosLapices.value = []
  mantenerLapicesEnPantalla()
}

onMounted(() => {
  iniciarEscena()
  window.addEventListener('resize', ajustarTamano)
  requestAnimationFrame(() => activarCamara())
})

onBeforeUnmount(() => {
  detenerCamara()
  window.removeEventListener('resize', ajustarTamano)
  cancelAnimationFrame(animacionId)
  lapices.forEach((lapiz) => escena.remove(lapiz.objeto))
  renderizador?.dispose()
  renderizador?.domElement?.remove()
})
</script>

<template>
  <section class="juego-lapiz">
    <div class="panel-puntaje">
      <strong>Puntaje: {{ puntaje }}/{{ metaLapices }}</strong>
      <BotonApp variante="secundario" @click="reiniciar">Reiniciar</BotonApp>
    </div>

    <div ref="contenedorRef" class="escena-lapiz">
      <video
        ref="videoRef"
        class="video-camara"
        :class="{ 'video-camara--activa': camaraActiva }"
        autoplay
        muted
        playsinline
      ></video>

      <div v-if="!camaraActiva" class="fondo-prueba">
        <span>LP</span>
        <p>Activa la camara y toca los lapices que aparezcan.</p>
      </div>

      <button
        v-for="objetivo in objetivosLapices.filter((item) => item.visible)"
        :key="objetivo.id"
        type="button"
        class="objetivo-tactil"
        :style="{ left: objetivo.izquierda, top: objetivo.arriba }"
        aria-label="Atrapar lapiz"
        @click.stop="tocarLapiz(objetivo.id)"
        @touchstart.stop.prevent="tocarLapiz(objetivo.id)"
      ></button>

      <div v-if="camaraActiva && puntaje < metaLapices" class="guia-control">
        Toca los lapices antes de que caigan
      </div>

      <div v-if="puntaje >= metaLapices" class="panel-completado">
        <span>20/20</span>
        <h3>Sticker completado</h3>
        <p>Atrapaste todos los lapices de la actividad.</p>
        <BotonApp variante="secundario" @click.stop="reiniciar">Jugar otra vez</BotonApp>
      </div>
    </div>

    <p v-if="mensaje" class="mensaje-juego">{{ mensaje }}</p>

    <BotonApp v-if="!camaraActiva" bloque :disabled="cargandoCamara" @click="activarCamara">
      {{ cargandoCamara ? 'Abriendo camara...' : 'Activar camara' }}
    </BotonApp>
    <BotonApp v-else bloque variante="secundario" @click="detenerCamara">Detener camara</BotonApp>
  </section>
</template>

<style scoped>
.juego-lapiz {
  display: grid;
  gap: 14px;
}

.panel-puntaje {
  padding: 14px;
  border: 1px solid var(--borde);
  border-radius: 18px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  background: #fff;
  box-shadow: var(--sombra);
}

.panel-puntaje strong {
  color: var(--rojo);
  font-size: 1.25rem;
}

.escena-lapiz {
  position: relative;
  min-height: 470px;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(circle at 78% 18%, rgba(215, 25, 32, 0.28), transparent 24%),
    linear-gradient(145deg, #102f53, #06345f);
  box-shadow: var(--sombra);
  touch-action: none;
}

.escena-lapiz canvas {
  position: absolute;
  inset: 0;
  z-index: 3;
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

.objetivo-tactil {
  position: absolute;
  z-index: 7;
  width: 88px;
  height: 88px;
  border: 2px solid rgba(255, 255, 255, 0.48);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  transform: translate(-50%, -50%);
}

.objetivo-tactil:active {
  background: rgba(215, 25, 32, 0.28);
}

.guia-control {
  position: absolute;
  left: 50%;
  bottom: 14px;
  z-index: 6;
  width: min(82%, 320px);
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  color: var(--azul);
  font-size: 0.8rem;
  font-weight: 900;
  text-align: center;
  transform: translateX(-50%);
  pointer-events: none;
}

.panel-completado {
  position: absolute;
  inset: 0;
  z-index: 8;
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
