import React from 'react'
import { Route, HashRouter as Router, Routes } from 'react-router-dom'

// Pages
import AlreadySolved from '../pages/AlreadySolved.tsx'
import CreateSten from '../pages/CreateSten.tsx'
import Inbox from '../pages/Inbox.tsx'
import SolveSten from '../pages/SolveSten.tsx'
import StenReady from '../pages/StenReady.tsx'
import ViewSten from '../pages/ViewSten.tsx'

// Layout
import MainLayout from './layout/MainLayout.tsx'

const AppRouter: React.FC = () => {
	return (
		<Router>
			<MainLayout>
				<Routes>
					<Route path='/' element={<CreateSten />} />
					<Route path='/inbox' element={<Inbox />} />
					<Route path='/create' element={<CreateSten />} />
					<Route path='/ready/:id' element={<StenReady />} />
					<Route path='/solve/:id' element={<SolveSten />} />
					<Route path='/view/:id' element={<ViewSten />} />
					<Route path='/solved/:id' element={<AlreadySolved />} />
				</Routes>
			</MainLayout>
		</Router>
	)
}

export default AppRouter
