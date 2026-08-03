<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useAlbumStore } from '@/stores/album'
import TarjetaApp from '@/componentes/interfaz/TarjetaApp.vue'

const route = useRoute()
const album = useAlbumStore()
const sticker = computed(() => album.obtenerStickerPorId(route.params.id))
const contenedorRef = ref(null)
const mensaje = ref('Cargando modelo...')

let escena
let camara
let renderizador
let modelo
let animacionId
let arrastrando = false
let posicionX = 0

function prepararModelo(modeloCargado) {
  modeloCargado.traverse((objeto) => {
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

  const caja = new THREE.Box3().setFromObject(modeloCargado)
  const centro = new THREE.Vector3()
  const tamano = new THREE.Vector3()
  caja.getCenter(centro)
  caja.getSize(tamano)

  const dimensionMayor = Math.max(tamano.x, tamano.y, tamano.z) || 1
  const escala = 2.55 / dimensionMayor
  modeloCargado.scale.setScalar(escala)
  modeloCargado.position.set(-centro.x * escala, -centro.y * escala, -centro.z * escala)
  modeloCargado.rotation.y = -0.35
  return modeloCargado
}

function cargarModelo() {
  if (!sticker.value?.modeloVista3d) {
    mensaje.value = 'No hay modelo disponible.'
    return
  }

  const cargador = new GLTFLoader()
  cargador.load(
    sticker.value.modeloVista3d,
    (gltf) => {
      modelo = prepararModelo(gltf.scene)
      escena.add(modelo)
      mensaje.value = ''
    },
    (evento) => {
      if (!evento.total) return
      const avance = Math.round((evento.loaded / evento.total) * 100)
      mensaje.value = `Cargando modelo ${avance}%`
    },
    () => {
      mensaje.value = `No se pudo cargar Renato desde ${sticker.value.modeloVista3d}`
    },
  )
}

function iniciarVisor() {
  if (!contenedorRef.value || !sticker.value?.desbloqueado) return

  const ancho = contenedorRef.value.clientWidth
  const alto = contenedorRef.value.clientHeight

  escena = new THREE.Scene()
  camara = new THREE.PerspectiveCamera(40, ancho / alto, 0.1, 100)
  camara.position.set(0, 0.35, 5)

  renderizador = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderizador.setSize(ancho, alto)
  renderizador.domElement.className = 'canvas-modelo'
  contenedorRef.value.appendChild(renderizador.domElement)

  escena.add(new THREE.HemisphereLight('#ffffff', '#b8c7d6', 2.4))
  const luz = new THREE.DirectionalLight('#ffffff', 2.8)
  luz.position.set(3, 5, 4)
  escena.add(luz)

  cargarModelo()
  animar()
}

function animar() {
  animacionId = requestAnimationFrame(animar)
  if (modelo && !arrastrando) modelo.rotation.y += 0.006
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

function iniciarArrastre(evento) {
  arrastrando = true
  posicionX = evento.clientX
}

function moverModelo(evento) {
  if (!arrastrando || !modelo) return
  const distancia = evento.clientX - posicionX
  modelo.rotation.y += distancia * 0.01
  posicionX = evento.clientX
}

function terminarArrastre() {
  arrastrando = false
}

onMounted(() => {
  iniciarVisor()
  window.addEventListener('resize', ajustarTamano)
  window.addEventListener('pointerup', terminarArrastre)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', ajustarTamano)
  window.removeEventListener('pointerup', terminarArrastre)
  cancelAnimationFrame(animacionId)
  renderizador?.dispose()
  renderizador?.domElement?.remove()
})
</script>

<template>
  <div class="contenedor-vista vista-modelo">
    <template v-if="sticker">
      <header class="encabezado-vista">
        <p class="etiqueta">Modelo 3D</p>
        <h1>Renato</h1>
        <p>Revisa a Renato antes de colocarlo en realidad aumentada.</p>
      </header>

      <TarjetaApp v-if="!sticker.desbloqueado" class="vista-bloqueada">
        <h2>Sticker bloqueado</h2>
        <p>Escanea el codigo desde Inicio para desbloquearlo.</p>
        <RouterLink to="/escanear">Escanear</RouterLink>
      </TarjetaApp>

      <section v-else class="modelo-visual">
        <div
          ref="contenedorRef"
          class="visor-modelo"
          @pointerdown="iniciarArrastre"
          @pointermove="moverModelo"
          @pointerleave="terminarArrastre"
        >
          <div class="fondo-modelo"></div>
          <p v-if="mensaje" class="mensaje-modelo">{{ mensaje }}</p>
        </div>

        <div class="acciones-modelo">
          <RouterLink class="boton-secundario" to="/album">Album</RouterLink>
          <RouterLink class="boton-jugar" :to="{ name: 'juego', params: { id: sticker.id } }">
            Colocar AR
          </RouterLink>
        </div>
      </section>
    </template>

    <TarjetaApp v-else class="vista-bloqueada">
      <h1>Modelo no encontrado</h1>
      <RouterLink to="/album">Volver al album</RouterLink>
    </TarjetaApp>
  </div>
</template>

<style scoped>
.vista-modelo {
  display: grid;
  gap: 14px;
}

.modelo-visual {
  display: grid;
  gap: 14px;
}

.visor-modelo {
  position: relative;
  min-height: 460px;
  overflow: hidden;
  border-radius: 30px;
  background:
    radial-gradient(circle at 78% 16%, rgba(215, 25, 32, 0.22), transparent 28%),
    linear-gradient(145deg, #ffffff, #e7f2ff);
  box-shadow: var(--sombra);
  touch-action: none;
}

.fondo-modelo {
  position: absolute;
  right: 18%;
  bottom: 52px;
  left: 18%;
  height: 38px;
  border-radius: 50%;
  background: rgba(16, 47, 83, 0.12);
  filter: blur(2px);
}

:deep(.canvas-modelo) {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
}

.mensaje-modelo {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  color: var(--azul);
  font-weight: 900;
}

.acciones-modelo {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.boton-jugar,
.boton-secundario,
.vista-bloqueada a {
  min-height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 900;
}

.boton-jugar {
  background: var(--rojo);
}

.boton-secundario,
.vista-bloqueada a {
  background: var(--azul);
}

.vista-bloqueada {
  padding: 18px;
}

.vista-bloqueada p {
  color: var(--texto-suave);
  line-height: 1.45;
}
</style>
