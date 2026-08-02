import stickerLapiz from '@/stickers/lapiz.png'

const rutaBase = import.meta.env.BASE_URL

export const stickersIniciales = [
  {
    id: 1,
    nombre: 'Lapiz',
    icono: 'LP',
    color: '#eef4fa',
    colorModelo: '#003f7d',
    imagen: stickerLapiz,
    modeloVista3d: `${rutaBase}modelos/renato.glb`,
    modelo3d: `${rutaBase}modelos/lapiz.glb`,
    desbloqueado: false,
    juego: {
      titulo: 'Atrapa los lapices',
      descripcion: 'Toca los lapices que aparecen en realidad aumentada antes de que caigan.',
      objetivo: 'Toca 20 lapices',
      elementos: ['Lapiz'],
    },
  },
]
