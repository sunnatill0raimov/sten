import mongoose from 'mongoose'

const connectDB = async () => {
	try {
		await mongoose.connect(process.env.DATABASE_URL)
		console.log('MongoDB Atlas connected successfully')
	} catch (error) {
		console.error('MongoDB Atlas connection error:', error.message)
		process.exit(1)
	}
}

export default connectDB
