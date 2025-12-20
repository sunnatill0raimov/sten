import React from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../../contexts/NotificationContext'

const Navbar: React.FC = () => {
	const { unclaimedPrizes } = useNotifications();

	return (
		<nav className='bg-[#0A0A0A] border-b border-[rgba(255,255,255,0.08)]'>
			<div className='max-w-[480px] mx-auto px-6 py-5'>
				<div className='flex justify-between items-center'>
					<Link to='/create'>
						<span className='text-2xl font-black text-white tracking-wide'>
							STEN
						</span>
					</Link>
					<div className='relative'>
						<Link
							to='/inbox'
							className='text-lg font-semibold text-white/70 hover:text-white transition-all duration-200 hover:scale-105'
						>
							INBOX
						</Link>
						{unclaimedPrizes > 0 && (
							<div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></div>
						)}
					</div>
				</div>
			</div>
		</nav>
	)
}

export default Navbar
