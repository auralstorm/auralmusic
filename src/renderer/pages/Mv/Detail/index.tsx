import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useMvDrawerStore } from '@/stores/mv-drawer-store'

const MvDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const openMvDrawer = useMvDrawerStore(state => state.openDrawer)
  const mvId = Number(id)

  useEffect(() => {
    if (!mvId) {
      navigate('/', { replace: true })
      return
    }

    openMvDrawer(mvId)
    navigate('/', { replace: true })
  }, [mvId, navigate, openMvDrawer])

  return null
}

export default MvDetail
