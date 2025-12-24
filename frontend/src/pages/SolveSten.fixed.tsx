import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
	getStenMetadata,
	StenApiError,
	viewSten,
	type StenMetadata,
} from '../api/stenApi'

type ViewState =
	| 'loading'
	| 'not_found'
	| 'expired'
	| 'views_reached'
	| 'password_required'
	| 'ready_to_view'
	| 'access_denied'
	| 'sten_revealed'

const SolveStenFixed: React.FC = () => {
	const { id } = useParams()
	const navigate = useNavigate()

	const [sten, setSten] = useState<StenMetadata | null>(null)
	const [state, setState] = useState<ViewState>('loading')
	const [content, setContent] = useState<string>('')
	const [password, setPassword] = useState<string>('')
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)
	const [timeRemaining, setTimeRemaining] = useState<string | null>(null)

	const stenId = id ?? ''

	useEffect(() => {
		let mounted = true

		const load = async () => {
			setIsLoading(true)
			setError(null)
			try {
				if (!stenId) {
					setState('not_found')
					return
				}

				const meta = await getStenMetadata(stenId)
				if (!mounted) return

				setSten(meta)

				if (!meta || meta.exists === false || meta.destroyed) {
					setState('not_found')
					return
				}

				if (meta.expired) {
					setState('expired')
					return
				}

				if (
					typeof meta.viewsRemaining === 'number' &&
					meta.viewsRemaining <= 0
				) {
					setState('views_reached')
					return
				}

				if (meta.isPasswordProtected || meta.requiresPassword) {
					setState('password_required')
					return
				}

				setState('ready_to_view')
			} catch (err: any) {
				if (err instanceof StenApiError) {
					if (err.code === 'STEN_NOT_FOUND') setState('not_found')
					else if (err.code === 'STEN_EXPIRED') setState('expired')
					else if (err.code === 'VIEWS_LIMIT_REACHED') setState('views_reached')
					else setState('not_found')
				} else {
					setError(String(err?.message ?? err))
					setState('not_found')
				}
			} finally {
				if (mounted) setIsLoading(false)
			}
		}

		load()

		return () => {
			mounted = false
		}
	}, [stenId])

	// Timer effect
	useEffect(() => {
		const expiresAt = sten?.expiresAt
		if (!expiresAt) {
			setTimeRemaining(null)
			return
		}

		const update = () => {
			const expires = new Date(expiresAt).getTime()
			const diff = expires - Date.now()
			if (diff <= 0) {
				setTimeRemaining('Expired')
				setState('expired')
				return
			}

			const seconds = Math.floor(diff / 1000)
			if (seconds < 3600) {
				const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
				const ss = String(seconds % 60).padStart(2, '0')
				setTimeRemaining(`${mm}:${ss}`)
			} else {
				const hours = Math.floor(seconds / 3600)
				const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
				setTimeRemaining(`${hours}:${mins}`)
			}
		}

		update()
		const idInterval = setInterval(update, 1000)
		return () => clearInterval(idInterval)
	}, [sten])

	const hasPassword = useMemo(() => {
		return Boolean(sten?.isPasswordProtected || sten?.requiresPassword)
	}, [sten])

	const formatShareId = () => stenId || ''
	const formatViewCount = () => {
		if (!sten) return '—'
		if (sten.viewsRemaining === 'unlimited') return 'unlimited'
		if (typeof sten.viewsRemaining === 'number')
			return String(sten.viewsRemaining)
		return '—'
	}

	const getCreatedAt = () => {
		if (!sten || !sten.createdAt) return 'Unknown'
		try {
			return new Date(sten.createdAt).toLocaleDateString()
		} catch {
			return 'Unknown'
		}
	}

	const copyToClipboard = async () => {
		try {
			if (!stenId) return
			await navigator.clipboard.writeText(
				window.location.origin + '/s/' + stenId
			)
		} catch {
			// ignore
		}
	}

	const handleCreateNew = () => navigate('/')

	const refreshMetadata = async () => {
		try {
			if (!stenId) return
			const meta = await getStenMetadata(stenId)
			setSten(meta)
		} catch {
			// ignore
		}
	}

	const handleAccessSten = async (e?: React.FormEvent) => {
		e?.preventDefault()
		setIsLoading(true)
		setError(null)
		try {
			if (!stenId) return
			const res = await viewSten(stenId, password || undefined)
			setContent(res.content)
			setState('sten_revealed')
			await refreshMetadata()
		} catch (err: any) {
			if (err instanceof StenApiError) {
				if (
					err.code === 'INVALID_PASSWORD' ||
					err.code === 'PASSWORD_REQUIRED'
				) {
					setError(err.message)
					setState('access_denied')
					return
				}
				if (err.code === 'STEN_EXPIRED') {
					setState('expired')
					return
				}
				if (err.code === 'VIEWS_LIMIT_REACHED') {
					setState('views_reached')
					return
				}
				if (err.code === 'STEN_NOT_FOUND') {
					setState('not_found')
					return
				}
				setError(err.message)
			} else {
				setError(String(err?.message ?? err))
			}
		} finally {
			setIsLoading(false)
		}
	}

	// Early return patterns
	if (state === 'loading') {
		return (
			<div className='min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4'>
				<div className='text-center'>
					<div className='animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C3AED] mx-auto mb-4'></div>
					<p className='text-white text-lg'>Loading secure content...</p>
				</div>
			</div>
		)
	}

	if (state === 'not_found') {
		return (
			<div className='min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4'>
				<div className='w-full max-w-[560px] text-center'>
					<div className='bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8'>
						<h1 className='text-2xl font-bold text-white mb-4'>
							Content Not Found
						</h1>
						<p className='text-white/70 mb-8'>
							The secure content you're looking for doesn't exist or has been
							removed.
						</p>
						<button
							onClick={handleCreateNew}
							className='bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 px-6 rounded-xl'
						>
							Create New Sten
						</button>
					</div>
				</div>
			</div>
		)
	}

	if (state === 'expired') {
		return (
			<div className='min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4'>
				<div className='w-full max-w-[560px] text-center'>
					<div className='bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8'>
						<h1 className='text-2xl font-bold text-white mb-4'>
							Content Expired
						</h1>
						<p className='text-white/70 mb-8'>
							This secure content has expired and is no longer accessible.
						</p>
						<button
							onClick={handleCreateNew}
							className='bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 px-6 rounded-xl'
						>
							Create New Sten
						</button>
					</div>
				</div>
			</div>
		)
	}

	if (state === 'views_reached') {
		return (
			<div className='min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4'>
				<div className='w-full max-w-[560px] text-center'>
					<div className='bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl p-8'>
						<h1 className='text-2xl font-bold text-white mb-4'>
							View Limit Reached
						</h1>
						<p className='text-white/70 mb-8'>
							This content has reached its maximum view limit and can no longer
							be accessed.
						</p>
						<button
							onClick={handleCreateNew}
							className='bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-3 px-6 rounded-xl'
						>
							Create New Sten
						</button>
					</div>
				</div>
			</div>
		)
	}

	if (
		state === 'password_required' ||
		state === 'ready_to_view' ||
		state === 'access_denied'
	) {
		return (
			<div className='min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4'>
				<div className='w-full max-w-[560px]'>
					<div className='bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl overflow-hidden'>
						<div className='p-8'>
							<div className='text-center mb-6'>
								<h1 className='text-3xl font-extrabold text-white mb-2'>
									{sten?.title ?? 'Untitled'}
								</h1>
								{sten?.description && (
									<p className='text-white/60 text-sm mx-auto max-w-[44rem]'>
										{sten?.description}
									</p>
								)}
								<div className='mt-3 flex items-center justify-center gap-4'>
									{sten?.prize && (
										<div className='flex items-center gap-2 text-sm text-yellow-300'>
											<span className='text-lg'>🏆</span>
											<span className='font-medium'>{sten.prize}</span>
										</div>
									)}
									{typeof sten?.charCount === 'number' && (
										<div className='text-sm text-white/70'>
											<span className='font-medium'>{sten.charCount}</span>{' '}
											<span className='text-white/60'>characters</span>
										</div>
									)}
								</div>
							</div>

							<div className='text-white/50 text-sm mt-3 flex items-center justify-center gap-4'>
								<div>
									Share: <span className='font-mono'>{formatShareId()}</span>
								</div>
								{hasPassword && (
									<div className='flex items-center gap-1'>
										<span aria-hidden>🔒</span>
										<span className='sr-only'>Password protected</span>
									</div>
								)}
								<div>
									Views:{' '}
									<span className='font-medium'>{formatViewCount()}</span>
								</div>
								<div>
									Created: <span className='font-medium'>{getCreatedAt()}</span>
								</div>
								{timeRemaining && <div>{timeRemaining}</div>}
							</div>

							<form onSubmit={handleAccessSten} className='space-y-4'>
								{state === 'password_required' && (
									<div>
										<label
											htmlFor='password'
											className='block text-white/70 text-sm mb-2'
										>
											Enter Password
										</label>
										<input
											id='password'
											type='password'
											value={password}
											onChange={e => setPassword(e.target.value)}
											className='w-full bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]'
											placeholder='Password'
											required
											autoFocus
										/>
									</div>
								)}

								{error && state === 'access_denied' && (
									<div className='bg-red-900/20 border border-red-500/50 rounded-xl p-4'>
										<p className='text-red-400 text-sm'>{error}</p>
									</div>
								)}

								<button
									type='submit'
									disabled={isLoading}
									className='w-full bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-[#7C3AED]/50 text-white font-semibold py-3 px-6 rounded-xl transition-colors'
								>
									{isLoading
										? 'Loading...'
										: state === 'password_required'
										? 'Unlock Content'
										: 'View Content'}
								</button>
							</form>
						</div>
					</div>
				</div>
			</div>
		)
	}

	if (state === 'sten_revealed') {
		return (
			<div className='min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-8'>
				<div className='w-full max-w-[800px]'>
					<div className='bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl overflow-hidden'>
						<div className='p-8'>
							<div className='flex items-center justify-between mb-6'>
								<div>
									<h1 className='text-3xl font-extrabold text-white'>
										{sten?.title ?? 'Untitled'}
									</h1>
									{sten?.description && (
										<p className='text-white/60 text-sm mt-1 max-w-[48rem]'>
											{sten.description}
										</p>
									)}

									<div className='text-white/50 text-sm mt-2 flex items-center gap-4'>
										<div>
											Views:{' '}
											<span className='font-medium'>{formatViewCount()}</span>
										</div>
										<div>
											Created:{' '}
											<span className='font-medium'>{getCreatedAt()}</span>
										</div>
										{timeRemaining && <div>{timeRemaining}</div>}
										{hasPassword && (
											<div className='flex items-center gap-1'>
												<span aria-hidden>🔒</span>
												<span className='sr-only'>Password protected</span>
											</div>
										)}
									</div>
								</div>
								<div className='flex gap-2'>
									<button
										onClick={copyToClipboard}
										className='bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold py-2 px-4 rounded-xl transition-colors flex items-center gap-2'
									>
										Copy
									</button>
									<button
										onClick={handleCreateNew}
										className='bg-[#0A0A0A] hover:bg-[#1A1A1A] text-white font-semibold py-2 px-4 rounded-xl border border-[rgba(255,255,255,0.1)] transition-colors'
									>
										Create New
									</button>
								</div>
							</div>

							<div className='bg-[#0A0A0A] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 mb-6'>
								<pre className='text-white whitespace-pre-wrap break-words font-mono text-sm'>
									{content}
								</pre>
							</div>

							{sten?.createdAt && (
								<div className='bg-yellow-900/20 border border-yellow-500/50 rounded-xl p-4'>
									<div className='flex gap-3'>
										<div>
											<p className='text-yellow-400 font-semibold text-sm mb-1'>
												Security Notice
											</p>
											<p className='text-yellow-400/80 text-sm'>
												This content has been viewed and may have reduced
												availability. Save it now if needed.
											</p>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		)
	}

	return null
}

export default SolveStenFixed
