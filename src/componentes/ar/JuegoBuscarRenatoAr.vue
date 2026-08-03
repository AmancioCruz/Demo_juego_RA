<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import BotonApp from '@/componentes/interfaz/BotonApp.vue'

const props = defineProps({
  sticker: { type: Object, required: true },
})

const contenedorRef = ref(null)
const mensaje = ref('')
const estadoRa = ref('Preparando experiencia AR...')
const xrSoportado = ref(false)
const sesionActiva = ref(false)
const planoEncontrado = ref(false)
const modeloColocado = ref(false)
const encontrados = ref(0)
const meta = 3

let escena
let camara
let renderizador
let modeloRenato
let reticulo
let controlador
let sesionXr
let espacioReferencia
let espacioVisor
let fuenteHitTest
let hitTestSolicitado = false
let anchorRenato

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
  const tamano = new THREE.Vector3()
  caja.getSize(tamano)
  const dimensionMayor = Math.max(tamano.x, tamano.y, tamano.z) || 1
  modelo.scale.setScalar(0.45 / dimensionMayor)
  modelo.position.set(0, 0, 0)
  modelo.updateWorldMatrix(true, true)

  const cajaEscalada = new THREE.Box3().setFromObject(modelo)
  const centro = new THREE.Vector3()
  cajaEscalada.getCenter(centro)
  modelo.position.set(-centro.x, -cajaEscalada.min.y, -centro.z)
  modelo.rotation.y = Math.PI
  return modelo
}

function cargarModeloRenato() {
  const cargador = new GLTFLoader()
  cargador.load(
    props.sticker.modeloVista3d,
    (gltf) => {
      modeloRenato = new THREE.Group()
      modeloRenato.matrixAutoUpdate = false
      modeloRenato.visible = false
      modeloRenato.add(prepararModelo(gltf.scene))
      escena.add(modeloRenato)
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

function crearReticulo() {
  const geometria = new THREE.RingGeometry(0.11, 0.14, 36).rotateX(-Math.PI / 2)
  const material = new THREE.MeshBasicMaterial({
    color: '#ffd54f',
    transparent: true,
    opacity: 0.95,
  })
  const malla = new THREE.Mesh(geometria, material)
  malla.matrixAutoUpdate = false
  malla.visible = false
  escena.add(malla)
  return malla
}

function iniciarEscena() {
  const ancho = contenedorRef.value.clientWidth
  const alto = contenedorRef.value.clientHeight

  escena = new THREE.Scene()
  camara = new THREE.PerspectiveCamera(70, ancho / alto, 0.01, 30)

  renderizador = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderizador.xr.enabled = true
  renderizador.xr.setReferenceSpaceType('local-floor')
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderizador.setSize(ancho, alto)
  renderizador.domElement.className = 'canvas-xr'
  contenedorRef.value.appendChild(renderizador.domElement)

  escena.add(new THREE.HemisphereLight('#ffffff', '#abc7df', 2.2))
  const luz = new THREE.DirectionalLight('#ffffff', 2.6)
  luz.position.set(2, 4, 3)
  escena.add(luz)

  reticulo = crearReticulo()
  cargarModeloRenato()

  controlador = renderizador.xr.getController(0)
  controlador.addEventListener('select', colocarModeloEnReticulo)
  escena.add(controlador)
}

async function revisarSoporteWebXr() {
  xrSoportado.value = Boolean(
    navigator.xr && (await navigator.xr.isSessionSupported('immersive-ar')),
  )
  mensaje.value = xrSoportado.value ? mensaje.value : 'Este navegador o dispositivo no soporta WebXR AR.'
  estadoRa.value = xrSoportado.value
    ? 'Inicia RA y apunta al suelo o una mesa.'
    : 'Este navegador o dispositivo no soporta WebXR AR.'
}

async function iniciarSesionRa() {
  if (!xrSoportado.value || sesionActiva.value) return

  try {
    sesionXr = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['hit-test', 'local-floor'],
      optionalFeatures: ['dom-overlay', 'anchors'],
      domOverlay: { root: contenedorRef.value },
    })

    sesionXr.addEventListener('end', finalizarSesionRa)
    await renderizador.xr.setSession(sesionXr)
    espacioReferencia = await sesionXr.requestReferenceSpace('local-floor')
    espacioVisor = await sesionXr.requestReferenceSpace('viewer')
    fuenteHitTest = await sesionXr.requestHitTestSource({ space: espacioVisor })
    renderizador.xr.setReferenceSpace(espacioReferencia)
    renderizador.setAnimationLoop(renderizarFrameXr)

    sesionActiva.value = true
    planoEncontrado.value = false
    modeloColocado.value = false
    estadoRa.value = 'Busca una superficie plana.'
  } catch {
    estadoRa.value = 'No se pudo iniciar WebXR AR. Usa Chrome Android con HTTPS.'
  }
}

function finalizarSesionRa() {
  sesionActiva.value = false
  planoEncontrado.value = false
  modeloColocado.value = false
  hitTestSolicitado = false
  fuenteHitTest?.cancel?.()
  fuenteHitTest = null
  espacioReferencia = null
  espacioVisor = null
  anchorRenato?.delete?.()
  anchorRenato = null
  reticulo.visible = false
  if (modeloRenato) modeloRenato.visible = false
  renderizador.setAnimationLoop(null)
  estadoRa.value = 'Inicia RA y apunta al suelo o una mesa.'
}

async function colocarModeloEnReticulo() {
  if (!reticulo?.visible || !modeloRenato || modeloColocado.value) return

  modeloRenato.matrix.copy(reticulo.matrix)
  modeloRenato.matrix.decompose(modeloRenato.position, modeloRenato.quaternion, modeloRenato.scale)
  modeloRenato.matrixAutoUpdate = false
  modeloRenato.visible = true
  modeloColocado.value = true
  reticulo.visible = false
  estadoRa.value = 'Renato quedo colocado. Rodealo con el celular.'

  const resultado = reticulo.userData.hitTestResult
  if (resultado && typeof resultado.createAnchor === 'function') {
    try {
      anchorRenato = await resultado.createAnchor()
    } catch {
      anchorRenato = null
    }
  }
}

function actualizarReticulo(frame) {
  if (!fuenteHitTest || modeloColocado.value) return

  const resultados = frame.getHitTestResults(fuenteHitTest)
  if (!resultados.length) {
    reticulo.visible = false
    planoEncontrado.value = false
    estadoRa.value = 'Busca una superficie plana.'
    return
  }

  const resultado = resultados[0]
  const pose = resultado.getPose(espacioReferencia)
  if (!pose) return

  reticulo.visible = true
  planoEncontrado.value = true
  reticulo.matrix.fromArray(pose.transform.matrix)
  reticulo.userData.hitTestResult = resultado
  estadoRa.value = 'Superficie detectada. Toca para colocar a Renato.'
}

function actualizarAnchor(frame) {
  if (!anchorRenato || !modeloRenato?.visible) return
  const pose = frame.getPose(anchorRenato.anchorSpace, espacioReferencia)
  if (!pose) return
  modeloRenato.matrix.fromArray(pose.transform.matrix)
}

function renderizarFrameXr(timestamp, frame) {
  if (!frame) return

  if (!hitTestSolicitado) hitTestSolicitado = true
  actualizarReticulo(frame)
  actualizarAnchor(frame)
  renderizador.render(escena, camara)
}

function reiniciar() {
  encontrados.value = 0
  modeloColocado.value = false
  planoEncontrado.value = false
  anchorRenato?.delete?.()
  anchorRenato = null
  if (modeloRenato) modeloRenato.visible = false
  if (reticulo) reticulo.visible = false
  estadoRa.value = sesionActiva.value
    ? 'Busca una superficie plana.'
    : 'Inicia RA y apunta al suelo o una mesa.'
}

function ajustarTamano() {
  if (!contenedorRef.value || !renderizador || !camara) return
  const ancho = contenedorRef.value.clientWidth
  const alto = contenedorRef.value.clientHeight
  camara.aspect = ancho / alto
  camara.updateProjectionMatrix()
  renderizador.setSize(ancho, alto)
}

onMounted(() => {
  iniciarEscena()
  revisarSoporteWebXr()
  window.addEventListener('resize', ajustarTamano)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', ajustarTamano)
  controlador?.removeEventListener('select', colocarModeloEnReticulo)
  sesionXr?.end?.()
  renderizador?.setAnimationLoop(null)
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

    <div ref="contenedorRef" class="escena-renato">
      <div class="overlay-xr">
        <div class="estado-xr">
          <span :class="{ 'estado-xr__punto--activo': planoEncontrado || modeloColocado }"></span>
          <p>{{ estadoRa }}</p>
        </div>

        <div v-if="!sesionActiva" class="inicio-xr">
          <div class="icono-xr">AR</div>
          <h2>Coloca a Renato</h2>
          <p>Inicia RA, apunta a una superficie plana y toca para poner el modelo ahi.</p>
          <BotonApp bloque :disabled="!xrSoportado || !modeloRenato" @click="iniciarSesionRa">
            Iniciar RA
          </BotonApp>
          <p v-if="mensaje" class="mensaje-juego">{{ mensaje }}</p>
        </div>
      </div>
    </div>
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
  min-height: 540px;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(circle at 72% 18%, rgba(215, 25, 32, 0.18), transparent 25%),
    linear-gradient(145deg, #102f53, #06345f);
  box-shadow: var(--sombra);
}

:deep(.canvas-xr) {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100% !important;
  height: 100% !important;
}

.overlay-xr {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  pointer-events: none;
}

.estado-xr {
  align-self: start;
  margin: 14px;
  max-width: calc(100% - 28px);
  padding: 10px 12px;
  border-radius: 999px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  color: var(--azul);
  background: rgba(255, 255, 255, 0.92);
  font-size: 0.82rem;
  font-weight: 900;
  backdrop-filter: blur(14px);
  box-shadow: 0 12px 30px rgba(6, 35, 64, 0.18);
}

.estado-xr span {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--amarillo);
  box-shadow: 0 0 0 5px rgba(255, 213, 79, 0.22);
}

.estado-xr__punto--activo {
  background: var(--verde, #1fbf75) !important;
  box-shadow: 0 0 0 5px rgba(31, 191, 117, 0.2) !important;
}

.estado-xr p {
  margin: 0;
}

.inicio-xr {
  align-self: center;
  justify-self: center;
  width: min(86%, 330px);
  padding: 18px;
  border-radius: 22px;
  display: grid;
  gap: 12px;
  justify-items: center;
  color: var(--azul);
  background: rgba(255, 255, 255, 0.94);
  text-align: center;
  pointer-events: auto;
  box-shadow: var(--sombra);
}

.icono-xr {
  width: 62px;
  height: 62px;
  border-radius: 20px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--rojo);
  font-size: 1.1rem;
  font-weight: 950;
}

.inicio-xr h2,
.inicio-xr p {
  margin: 0;
}

.inicio-xr p {
  color: var(--texto-suave);
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.35;
}

.mensaje-juego {
  color: var(--rojo);
}
</style>
