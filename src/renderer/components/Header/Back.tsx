import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// 返回按钮组件，包含前进和后退功能
const Back = () => {
  const navigate = useNavigate()
  return (
    <button className='flex items-center gap-3'>
      <ArrowLeft className='w-5 h-5' onClick={() => navigate(-1)} />
      <ArrowRight className='w-5 h-5' onClick={() => navigate(1)} />
    </button>
  )
}

export default Back
