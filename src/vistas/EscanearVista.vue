<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAlbumStore } from '@/stores/album'
import BotonApp from '@/componentes/interfaz/BotonApp.vue'

const album = useAlbumStore()
const videoRef = ref(null)
const camaraActiva = ref(false)
const cargando = ref(false)
const mensaje = ref('')
const stickerDesbloqueado = ref(null)
let flujoCamara
let temporizadorEscaneo

async function activarCamara() {
  if (cargando.value || camaraActiva.value) return

  if (!navigator.mediaDevices?.getUserMedia) {
    mensaje.value = 'Este navegador no permite abrir la camara.'
    return
  }

  cargando.value = true
  try {
    await nextTick()
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
    mensaje.value = 'Alinea el codigo dentro del marco.'
    iniciarEscaneoAutomatico()
  } catch {
    mensaje.value = 'No se pudo abrir la camara. Revisa permisos o usa localhost/HTTPS.'
  } finally {
    cargando.value = false
  }
}

function detenerCamara() {
  clearTimeout(temporizadorEscaneo)
  flujoCamara?.getTracks().forEach((track) => track.stop())
  flujoCamara = null
  camaraActiva.value = false
}

function iniciarEscaneoAutomatico() {
  clearTimeout(temporizadorEscaneo)
  temporizadorEscaneo = setTimeout(() => {
    if (!camaraActiva.value || stickerDesbloqueado.value) return
    desbloquearSticker()
  }, 2600)
}

function desbloquearSticker() {
  const sticker = album.escanearCodigo()
  stickerDesbloqueado.value = sticker
  mensaje.value = sticker
    ? `Sticker ${sticker.nombre} desbloqueado.`
    : 'No se encontro un sticker para desbloquear.'
}

onMounted(() => {
  requestAnimationFrame(() => activarCamara())
})

onBeforeUnmount(() => {
  detenerCamara()
})
</script>

<template>
  <div class="contenedor-vista escanear-vista">
    <section class="camara-qr">
      <video
        ref="videoRef"
        class="video-camara"
        :class="{ 'video-camara--activa': camaraActiva }"
        autoplay
        muted
        playsinline
      ></video>

      <div v-if="!camaraActiva" class="estado-camara">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 7h3l1.4-2h7.2L17 7h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 4 7Zm8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          />
        </svg>
        <span>{{ cargando ? 'Abriendo camara...' : 'Camara lista' }}</span>
      </div>

      <div class="barra-superior">
        <RouterLink to="/" aria-label="Volver a inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15.5 5 8.5 12l7 7-1.8 1.8L4.9 12l8.8-8.8z" />
          </svg>
        </RouterLink>
        <strong>Escaner</strong>
      </div>

      <div class="marco-escaneo" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div class="panel-observacion" :class="{ 'panel-observacion--exito': stickerDesbloqueado }">
        <p role="status">{{ mensaje || 'Activa la camara para escanear.' }}</p>

        <BotonApp v-if="!camaraActiva" bloque variante="secundario" :disabled="cargando" @click="activarCamara">
          Activar camara
        </BotonApp>

        <div v-if="stickerDesbloqueado" class="acciones-escaner">
          <RouterLink class="boton-album" to="/album">Ver en album</RouterLink>
          <RouterLink class="boton-jugar" :to="{ name: 'juego', params: { id: stickerDesbloqueado.id } }">
            Jugar
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.escanear-vista {
  display: grid;
  gap: 14px;
  min-height: calc(100vh - 108px);
}

.camara-qr {
  position: relative;
  min-height: calc(100vh - 136px);
  overflow: hidden;
  border-radius: 28px;
  background:
    radial-gradient(circle at 80% 18%, rgba(215, 25, 32, 0.34), transparent 28%),
    linear-gradient(145deg, #102f53, #06345f);
  box-shadow: var(--sombra-fuerte);
}

.video-camara {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
}

.video-camara--activa {
  opacity: 1;
}

.estado-camara {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 10px;
  color: #fff;
  text-align: center;
}

.estado-camara svg {
  width: 44px;
  height: 44px;
  fill: currentColor;
  opacity: 0.9;
}

.estado-camara span {
  font-weight: 900;
}

.barra-superior {
  position: absolute;
  top: 14px;
  right: 14px;
  left: 14px;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
  pointer-events: none;
}

.barra-superior a {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(16, 47, 83, 0.58);
  backdrop-filter: blur(12px);
  pointer-events: auto;
}

.barra-superior svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.barra-superior strong {
  padding: 10px 12px;
  border-radius: 999px;
  background: rgba(16, 47, 83, 0.58);
  font-size: 0.82rem;
  backdrop-filter: blur(12px);
}

.marco-escaneo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(72vw, 270px);
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
}

.marco-escaneo span {
  position: absolute;
  width: 44px;
  height: 44px;
  border-color: #fff;
}

.marco-escaneo span:nth-child(1) {
  top: 0;
  left: 0;
  border-top: 5px solid;
  border-left: 5px solid;
  border-radius: 16px 0 0;
}

.marco-escaneo span:nth-child(2) {
  top: 0;
  right: 0;
  border-top: 5px solid;
  border-right: 5px solid;
  border-radius: 0 16px 0 0;
}

.marco-escaneo span:nth-child(3) {
  right: 0;
  bottom: 0;
  border-right: 5px solid;
  border-bottom: 5px solid;
  border-radius: 0 0 16px;
}

.marco-escaneo span:nth-child(4) {
  bottom: 0;
  left: 0;
  border-bottom: 5px solid;
  border-left: 5px solid;
  border-radius: 0 0 0 16px;
}

.panel-observacion {
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  z-index: 5;
  padding: 14px;
  border-radius: 20px;
  color: #fff;
  background: rgba(16, 47, 83, 0.72);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(14px);
}

.panel-observacion--exito {
  background: rgba(0, 87, 168, 0.82);
}

.panel-observacion p {
  margin: 0 0 12px;
  font-size: 0.9rem;
  font-weight: 900;
  line-height: 1.35;
}

.panel-observacion p:last-child {
  margin-bottom: 0;
}

.acciones-escaner {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.boton-album,
.boton-jugar {
  min-height: 48px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 900;
}

.boton-album {
  background: var(--azul);
}

.boton-jugar {
  background: var(--rojo);
}
</style>
