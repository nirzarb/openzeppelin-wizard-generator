// server.js
const express = require('express')
const cors = require('cors')

const { generateUt } = require('./GenerateContracts/generateUt.js')
const { generateContract } = require('./GenerateContracts/generateGt.js')

const app = express()
const port = 5000

app.use(express.json())
app.use(cors())

const generateParams = (options) => {
	const params = {
		name: options.name,
		symbol: options.symbol,
		premint: options.premint,
		mintable: options.mintable,
		burnable: options.burnable,
		pausable: options.pausable,
		permit: options.permit,
		flashmint: options.flashmint,
		access: options.access,
	}

	return params
}

app.post('/ut-contract', async (req, res) => {
	const options = req.body
	try {
		const params = generateParams(options)
		const contract = generateUt(params, options.rewards)
		res.status(200).json({ contract })
	} catch (error) {
		res.status(501)
	}
})

app.post('/gt-contract', async (req, res) => {
	try {
		const options = req.body
		const params = generateParams(options)
		const contract = generateContract(
			params,
			options.staking,
			options.rewards,
			options.minStakingDuration,
			options.rewardsMultiplier,
			options.votingThreshold
		)

		res.status(200).json({ contract })
	} catch (error) {
		res.status(501)
	}
})

app.get('/', (req, res) => {
	res.send('Hello')
})

app.get('/secret-path', (req, res) => {
	res.status(200).send('You are at the right place!')
})

app.listen(port, () => {
	console.log(`Server is running on port ${port}`)
})
