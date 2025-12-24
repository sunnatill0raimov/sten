import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createSten } from '../api/stenApi'

const CreateSten: React.FC = () => {
	const navigate = useNavigate()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const documentInputRef = useRef<HTMLInputElement>(null)
	const [logo, setLogo] = useState<string | null>(null)
	const [documentFile, setDocumentFile] = useState<File | null>(null)
	const [documentName, setDocumentName] = useState<string | null>(null)
	const [stenTitle, setStenTitle] = useState('')
	const [stenText, setStenText] = useState('')
	const [password, setPassword] = useState('')
	const [expiresAfter, setExpiresAfter] = useState('1_hour')
	const [maxViews, setMaxViews] = useState('1')
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	const expiresOptions = [
		{ value: '1_hour', label: '1 Hour' },
		{ value: '24_hours', label: '24 Hours' },
		{ value: '7_days', label: '7 Days' },
		{ value: '30_days', label: '30 Days' },
	]

	const viewsOptions = [
		{ value: '1', label: '1 View' },
		{ value: '5', label: '5 Views' },
		{ value: '10', label: '10 Views' },
		{ value: 'unlimited', label: 'Unlimited' },
	]

	// Generate random secure password
	const generateRandomPassword = () => {
		const length = 16
		const charset =
			'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
		let newPassword = ''

		const lowercase = 'abcdefghijklmnopqrstuvwxyz'
		const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
		const numbers = '0123456789'
		const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'

		newPassword += lowercase[Math.floor(Math.random() * lowercase.length)]
		newPassword += uppercase[Math.floor(Math.random() * uppercase.length)]
		newPassword += numbers[Math.floor(Math.random() * numbers.length)]
		newPassword += symbols[Math.floor(Math.random() * symbols.length)]

		for (let i = newPassword.length; i < length; i++) {
			newPassword += charset[Math.floor(Math.random() * charset.length)]
		}

		newPassword = newPassword
			.split('')
			.sort(() => Math.random() - 0.5)
			.join('')

		setPassword(newPassword)
		setShowPassword(true)
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!stenText.trim()) {
			setError('Secret content is required')
			return
		}

		setError('')
		setIsLoading(true)

		try {
			// Create FormData for multipart upload
			const formData = new FormData()

			// Add existing fields
			formData.append('title', stenTitle.trim())
			formData.append('message', stenText.trim())
			formData.append('isPasswordProtected', String(!!password.trim()))
			formData.append('expiresIn', expiresAfter)
			formData.append('maxViews', maxViews === 'unlimited' ? 'null' : String(parseInt(maxViews)))

			if (password.trim()) {
				formData.append('password', password.trim())
			}

			// Add logo if present
			if (logo) {
				// Convert data URL to blob and append
				const logoBlob = await fetch(logo).then(r => r.blob())
				formData.append('logo', logoBlob, 'logo.png')
			}

							// Add attachment if present
							if (documentFile) {
								formData.append('attachment', documentFile)
							}

			const response = await createSten(formData)
			const linkParts = response.link.split('/')
			const stenId = linkParts[linkParts.length - 1]

			navigate(`/ready/${stenId}`, {
				state: {
					isPasswordProtected: !!password.trim(),
					password: password.trim() || null,
					expiresIn: expiresAfter,
					maxViews: maxViews,
					qrCode: response.qrCode || null,
				},
			})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create STEN')
		} finally {
			setIsLoading(false)
		}
	}

	const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			if (!file.type.match('image.*')) {
				return
			}
			const reader = new FileReader()
			reader.onload = (event) => {
				setLogo(event.target?.result as string)
			}
			reader.readAsDataURL(file)
		}
	}

	const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			// Accept common document formats
			const validTypes = [
				'application/pdf',
				'image/',
				'application/msword',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'text/plain'
			]

			if (!validTypes.some(type => file.type.match(type))) {
				setError('Unsupported file type. Please upload PDF, images, or common document formats.')
				return
			}

			setDocumentFile(file)
			setDocumentName(file.name)
		}
	}

	const removeDocument = (e: React.MouseEvent) => {
		e.stopPropagation()
		setDocumentFile(null)
		setDocumentName(null)
		if (documentInputRef.current) {
			documentInputRef.current.value = ''
		}
	}

	const removeLogo = (e: React.MouseEvent) => {
		e.stopPropagation()
		setLogo(null)
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}

	const hasContent = stenText.trim().length > 0
	const charCount = stenText.length

	return (
		<div className='min-h-screen bg-gradient-to-br from-black via-[#0A0A0A] to-black p-4 sm:p-6 md:p-8'>
			<div className='max-w-3xl mx-auto'>
				<div className='bg-gradient-to-br from-[#111111] to-[#0A0A0A] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl'>
					{/* Header */}
					<div className='text-center mb-6 sm:mb-8'>
						<div className='w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500/30 to-purple-600/20 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4'>
							<svg
								className='w-7 h-7 sm:w-8 sm:h-8 text-purple-400'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'
							>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth={2}
									d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
								/>
							</svg>
						</div>

						<h1 className='text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent mb-2'>
							Create Your Sten
						</h1>
						<p className='text-white/60 text-xs sm:text-sm px-4 mb-4'>
							Create an encrypted, self-destructing secure message
						</p>
						{/* Logo Upload - Touch Optimized */}
						<label className='flex flex-col items-center mb-4'>
							<input
								type='file'
								ref={fileInputRef}
								onChange={handleLogoChange}
								accept='image/png, image/jpeg, image/jpg, image/webp'
								className='hidden'
								disabled={isLoading}
							/>
							<div 
								className='relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/40 border-2 border-dashed border-white/20 flex items-center justify-center active:opacity-80 transition-opacity'
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									!isLoading && fileInputRef.current?.click();
								}}
								title='Upload logo (optional)'
							>
								{logo ? (
									<>
										<img 
											src={logo} 
											alt='Logo preview' 
											className='w-full h-full rounded-full object-cover'
										/>
										<button
											type='button'
											onClick={(e) => {
												e.stopPropagation();
												removeLogo(e);
											}}
											className='absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white text-sm active:bg-red-600 transition-colors'
											aria-label='Remove logo'
										>
											×
										</button>
									</>
								) : (
								<>
									<svg
										className='w-8 h-8 text-white/60'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M12 4v16m8-8H4'
										/>
									</svg>
									<span className='absolute bottom-0 translate-y-4 text-xs text-white/70 bg-black/70 px-2 py-0.5 rounded-full'>
										Tap to add logo
									</span>
								</>
								)}
							</div>
							<span className='mt-2 text-xs text-white/50'>
								{logo ? 'Tap to change logo' : ''}
							</span>
						</label>
					</div>

					<form onSubmit={handleSubmit} className='space-y-5 sm:space-y-6'>
						{/* Title Input */}
						<div className='space-y-2'>
							<label className='flex items-center gap-2 text-xs sm:text-sm font-semibold text-white'>
								<svg
									className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
									/>
								</svg>
								Title{' '}
								<span className='text-white/40 font-normal'>(optional)</span>
							</label>
							<input
								type='text'
								value={stenTitle}
								onChange={e => setStenTitle(e.target.value)}
								placeholder='e.g. Database credentials, API key'
								className='w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-black/40 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-white/40 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all'
							/>
							<p className='text-[10px] sm:text-xs text-white/40 flex items-center gap-1.5'>
								<svg
									className='w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
									/>
								</svg>
								<span className='leading-tight'>
									Helps identify what this secure message contains
								</span>
							</p>
						</div>

						{/* Secret Content */}
						<div className='space-y-2'>
							<label className='flex items-center gap-2 text-xs sm:text-sm font-semibold text-white'>
								<svg
									className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
									/>
								</svg>
								Secret Content <span className='text-red-400'>*</span>
							</label>
							<div className='relative'>
								<textarea
									value={stenText}
									onChange={e => setStenText(e.target.value)}
									placeholder='Write or paste your sensitive information here...'
									rows={5}
									className='w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-black/40 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-white/40 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none resize-none transition-all'
									required
								/>
								<div className='absolute bottom-2 sm:bottom-3 right-2 sm:right-3 text-[10px] sm:text-xs text-white/30 bg-black/60 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded'>
									{charCount}
								</div>
							</div>
							<div className='flex items-start gap-2 p-2.5 sm:p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg sm:rounded-xl'>
								<svg
									className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0 mt-0.5'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
									/>
								</svg>
								<p className='text-[10px] sm:text-xs text-blue-400/90 leading-relaxed'>
									<span className='font-semibold'>End-to-end encrypted:</span>{' '}
									Your content is encrypted in your browser
								</p>
							</div>
						</div>

						{/* Expiration and Views Grid */}
						<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
							{/* Expiration Time */}
							<div className='space-y-2'>
								<label className='flex items-center gap-2 text-xs sm:text-sm font-semibold text-white'>
									<svg
										className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
										/>
									</svg>
									Expiration Time
								</label>
								<select
									value={expiresAfter}
									onChange={e => setExpiresAfter(e.target.value)}
									className='w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-black/40 border border-white/10 rounded-lg sm:rounded-xl text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all cursor-pointer'
								>
									{expiresOptions.map(option => (
										<option
											key={option.value}
											value={option.value}
											className='bg-[#111111] text-white'
										>
											{option.label}
										</option>
									))}
								</select>
							</div>

							{/* Max Views */}
							<div className='space-y-2'>
								<label className='flex items-center gap-2 text-xs sm:text-sm font-semibold text-white'>
									<svg
										className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
										/>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
										/>
									</svg>
									Max Views
								</label>
								<select
									value={maxViews}
									onChange={e => setMaxViews(e.target.value)}
									className='w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-black/40 border border-white/10 rounded-lg sm:rounded-xl text-white focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all cursor-pointer'
								>
									{viewsOptions.map(option => (
										<option
											key={option.value}
											value={option.value}
											className='bg-[#111111] text-white'
										>
											{option.label}
										</option>
									))}
								</select>
							</div>
						</div>

						{/* Document Upload Section */}
						<div className='space-y-2'>
							<label className='flex items-center gap-2 text-xs sm:text-sm font-semibold text-white'>
								<svg
									className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M7 11l5-5m0 0l5 5m-5-5v12'
									/>
								</svg>
								Attach Document{' '}
								<span className='text-white/40 font-normal'>(optional)</span>
							</label>
							<div className='relative'>
								<input
									type='file'
									ref={documentInputRef}
									onChange={handleDocumentChange}
									accept='.pdf,.jpg,.jpeg,.png,.doc,.docx,.txt'
									className='hidden'
									disabled={isLoading}
								/>
								<div
									className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-black/40 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-white/40 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all cursor-pointer ${
										isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black/30'
									}`}
									onClick={() => !isLoading && documentInputRef.current?.click()}
								>
									{documentName ? (
										<div className='flex items-center justify-between'>
											<span className='truncate max-w-[80%]'>{documentName}</span>
											<button
												type='button'
												onClick={(e) => {
													e.stopPropagation();
													removeDocument(e);
												}}
												className='text-red-400 hover:text-red-300 transition-colors'
												title='Remove document'
											>
												<svg
													className='w-4 h-4'
													fill='none'
													stroke='currentColor'
													viewBox='0 0 24 24'
												>
													<path
														strokeLinecap='round'
														strokeLinejoin='round'
														strokeWidth={2}
														d='M6 18L18 6M6 6l12 12'
													/>
												</svg>
											</button>
										</div>
									) : (
										<span>Click to attach PDF, image, or document</span>
									)}
								</div>
								<p className='text-[10px] sm:text-xs text-white/40 flex items-center gap-1.5'>
									<svg
										className='w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
										/>
									</svg>
									<span className='leading-tight'>
										{documentFile
											? `Document ready: ${documentFile.type}`
											: 'PDF, images, Word docs, or text files'}
									</span>
								</p>
							</div>
						</div>

						{/* Password Protection */}
						<div className='space-y-2'>
							<label className='flex items-center gap-2 text-xs sm:text-sm font-semibold text-white'>
								<svg
									className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
									/>
								</svg>
								Password{' '}
								<span className='text-white/40 font-normal'>(optional)</span>
							</label>
							<div className='relative'>
								<button
									type='button'
									onClick={generateRandomPassword}
									className='absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-all z-10 hover:scale-110 active:scale-95'
									title='Generate secure password'
								>
									<svg
										className='w-4 h-4 sm:w-5 sm:h-5'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
										/>
									</svg>
								</button>
								<input
									type={showPassword ? 'text' : 'password'}
									value={password}
									onChange={e => setPassword(e.target.value)}
									placeholder='Click refresh to generate'
									className='w-full pl-10 sm:pl-11 pr-10 sm:pr-11 py-2.5 sm:py-3 text-sm sm:text-base bg-black/40 border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-white/40 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none transition-all'
								/>
								{password && (
									<button
										type='button'
										onClick={() => setShowPassword(!showPassword)}
										className='absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-all hover:scale-110 active:scale-95'
										title={showPassword ? 'Hide password' : 'Show password'}
									>
										{showPassword ? (
											<svg
												className='w-4 h-4 sm:w-5 sm:h-5'
												fill='none'
												stroke='currentColor'
												viewBox='0 0 24 24'
											>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth={2}
													d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'
												/>
											</svg>
										) : (
											<svg
												className='w-4 h-4 sm:w-5 sm:h-5'
												fill='none'
												stroke='currentColor'
												viewBox='0 0 24 24'
											>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth={2}
													d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
												/>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth={2}
													d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
												/>
											</svg>
										)}
									</button>
								)}
							</div>
							<p className='text-[10px] sm:text-xs text-white/40 flex items-center gap-1.5'>
								<svg
									className='w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
									/>
								</svg>
								<span className='leading-tight'>
									{password
										? 'Required to decrypt and view this message'
										: 'Add extra security with password'}
								</span>
							</p>
						</div>

						{/* Error Message */}
						{error && (
							<div className='p-3 sm:p-4 bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 rounded-lg sm:rounded-xl backdrop-blur-sm animate-shake'>
								<div className='flex items-start gap-2.5 sm:gap-3'>
									<div className='w-7 h-7 sm:w-8 sm:h-8 bg-red-500/30 rounded-lg flex items-center justify-center flex-shrink-0'>
										<svg
											className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M6 18L18 6M6 6l12 12'
											/>
										</svg>
									</div>
									<div>
										<p className='text-red-400 font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1'>
											Error Creating Sten
										</p>
										<p className='text-red-400/80 text-[11px] sm:text-sm leading-relaxed'>
											{error}
										</p>
									</div>
								</div>
							</div>
						)}

						{/* Submit Button */}
						<button
							type='submit'
							disabled={isLoading || !hasContent}
							className={`w-full py-3 sm:py-4 px-5 sm:px-6 text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all ${
								isLoading
									? 'bg-gray-600 text-gray-400 cursor-not-allowed'
									: hasContent
									? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white active:scale-[0.98] sm:hover:scale-[1.02] hover:shadow-2xl shadow-purple-500/50'
									: 'bg-gray-700 text-gray-500 cursor-not-allowed'
							}`}
						>
							{isLoading ? (
								<div className='flex items-center justify-center gap-2 sm:gap-3'>
									<div className='animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white/20 border-t-white'></div>
									<span>Creating...</span>
								</div>
							) : (
								<div className='flex items-center justify-center gap-2'>
									<svg
										className='w-4 h-4 sm:w-5 sm:h-5'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M13 10V3L4 14h7v7l9-11h-7z'
										/>
									</svg>
									Create Secure Link
								</div>
							)}
						</button>

						{/* Security Info */}
						<div className='flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-lg sm:rounded-xl'>
							<div className='w-7 h-7 sm:w-8 sm:h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0'>
								<svg
									className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
									/>
								</svg>
							</div>
							<div>
								<p className='text-green-400 font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1'>
									🔒 Secure & Private
								</p>
								<p className='text-green-400/80 text-[10px] sm:text-xs leading-relaxed'>
									Your message is encrypted end-to-end and will self-destruct
									after being viewed or when it expires.
								</p>
							</div>
						</div>
					</form>
				</div>
			</div>
		</div>
	)
}

export default CreateSten
