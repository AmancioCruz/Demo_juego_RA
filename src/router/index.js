import { createRouter, createWebHistory } from 'vue-router'

import InicioVista from '@/vistas/InicioVista.vue'
import PerfilVista from '@/vistas/PerfilVista.vue'
import EscanearVista from '@/vistas/EscanearVista.vue'
import AlbumVista from '@/vistas/AlbumVista.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/inicio', component: InicioVista },
    { path: '/album', component: AlbumVista },
    { path: '/perfil', component: PerfilVista },
    { path: '/escanear', component: EscanearVista },
  ],
})

export default router
