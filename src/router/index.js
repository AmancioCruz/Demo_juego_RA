import { createRouter, createWebHistory } from 'vue-router'
import InicioVista from '@/vistas/InicioVista.vue'
import AlbumVista from '@/vistas/AlbumVista.vue'
import EscanearVista from '@/vistas/EscanearVista.vue'
import PerfilVista from '@/vistas/PerfilVista.vue'
import JuegoVista from '@/vistas/JuegoVista.vue'
import RealidadAumentadaVista from '@/vistas/RealidadAumentadaVista.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'inicio', component: InicioVista },
    { path: '/album', name: 'album', component: AlbumVista },
    { path: '/escanear', name: 'escanear', component: EscanearVista },
    { path: '/juego/:id', name: 'juego', component: JuegoVista },
    { path: '/ar/:id', name: 'realidad-aumentada', component: RealidadAumentadaVista },
    { path: '/perfil', name: 'perfil', component: PerfilVista },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
