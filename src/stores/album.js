import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { stickersIniciales } from '@/datos/stickers'

export const useAlbumStore = defineStore('album', () => {
  const stickers = ref(stickersIniciales.map((sticker) => ({ ...sticker })))
  const usuario = ref({
    nombre: 'Alex',
    foto: 'A',
  })

  const cantidadDesbloqueados = computed(
    () => stickers.value.filter((sticker) => sticker.desbloqueado).length,
  )

  const porcentajeCompletado = computed(() =>
    Math.round((cantidadDesbloqueados.value / stickers.value.length) * 100),
  )

  function obtenerStickerPorId(idSticker) {
    return stickers.value.find((sticker) => sticker.id === Number(idSticker))
  }

  function escanearCodigo() {
    const lapiz = stickers.value.find((sticker) => sticker.nombre === 'Lapiz')
    if (!lapiz) return null
    lapiz.desbloqueado = true
    return lapiz
  }

  return {
    stickers,
    usuario,
    cantidadDesbloqueados,
    porcentajeCompletado,
    obtenerStickerPorId,
    escanearCodigo,
  }
})
