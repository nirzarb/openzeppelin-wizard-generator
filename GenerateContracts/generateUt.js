const { erc20 } = require('@openzeppelin/wizard')

const generateTransferFunction = (rewards) => {
	return rewards
		? `
  function transferFrom(address from, address to, uint256 amount) public override returns(bool) {
    approve(from, amount);
    _transfer(from, to, amount);

    return true;
  }
  
  function transfer(address to, uint256 amount) public override returns(bool) {
    _transfer(msg.sender, to, amount);
    return true;
  }`
		: `
  function transfer(address to, uint256 amount) public override returns(bool) {
    _transfer(msg.sender, to, amount);
    return true;
  }`
}

const generateUt = (params, rewards) => {
	try {
		const contract = erc20.print(params)

		const lastCurlyBraceIndex = contract.lastIndexOf('}')

		const modifiedContract =
			contract.slice(0, lastCurlyBraceIndex) +
			generateTransferFunction(rewards) +
			'\n' +
			contract.slice(lastCurlyBraceIndex)

		const finalContract = modifiedContract.replace(
			'/// @custom:oz-upgrades-unsafe-allow constructor',
			''
		)

		return finalContract
	} catch (err) {
		console.error(err)
	}
}

module.exports = { generateUt }
