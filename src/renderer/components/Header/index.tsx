import Account from '../Account'
import NavBar from '../NavBar'
import Back from './Back'

const Header = ({ className }) => {
  return (
    <header
      className={`w-full bg-background flex items-center justify-between px-4 py-4 ${className}`}
    >
      <Back />
      <NavBar />
      <Account />
    </header>
  )
}

export default Header
