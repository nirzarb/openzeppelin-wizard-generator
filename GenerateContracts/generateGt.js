const { erc20 } = require('@openzeppelin/wizard')

const generateTransferFunction = (params, staking, rewards) => {
	if (params.votes && rewards) {
		return `
  function transfer(address to, uint256 amount, address utAddr) public {
    require(
      amount <= balanceOf(msg.sender) - getStakedBalance(msg.sender),
      "Insufficient Balance or your balance is staked."
    );

    address from = msg.sender;
    _transfer(from, to, amount);
    updateDelegate(to);

    ERC20 utilityToken = ERC20(utAddr);
    uint256 rewardAmount = amount / REWARD_MULTIPLIER;

    utilityToken.transferFrom(from, to, rewardAmount);

    emit rewardsTransferred(from, to, rewardAmount);
  }
  
  function updateDelegate(address account) internal {
    if (stakingBalance[account] >= VOTING_THRESHOLD) {
        _delegate(account, account);
    } else {
        _delegate(account, address(0));
    }
  }`
	} else if (rewards) {
		return `
  function transfer(address to, uint256 amount, address utAddr) public {
    address from = msg.sender;
    _transfer(from, to, amount);

    ERC20 utilityToken = ERC20(utAddr);
    uint256 rewardAmount = amount / REWARD_MULTIPLIER;

    utilityToken.transferFrom(from, to, rewardAmount);

    emit rewardsTransferred(from, to, rewardAmount);
  }`
	} else if (staking) {
		return `
  function transfer(address to, uint256 amount) public override returns (bool) {
    require(
      amount <= balanceOf(msg.sender) - getStakedBalance(msg.sender),
      "Insufficient Balance or your balance is staked."
    );

    address from = msg.sender;
    _transfer(from, to, amount);
    updateDelegate(to);
    return true;
  }

  function updateDelegate(address account) internal {
    if (stakingBalance[account] >= VOTING_THRESHOLD) {
        _delegate(account, account);
    } else {
        _delegate(account, address(0));
    }
  }`
	} else {
		return `
  function transfer(address to, uint256 amount) public override returns(bool) {
    _transfer(msg.sender, to, amount);
    return true;
  }`
	}
}

const generateRewardsEvent = () => {
	return `
  event rewardsTransferred(address indexed from, address indexed to, uint256 amount);`
}

const generateRewardMultiplier = (rewards, rewardMultiplier) => {
	return rewards
		? `
  uint256 public constant REWARD_MULTIPLIER = ${rewardMultiplier};`
		: ``
}

const generateStakingMapping = (MIN_STAKING_DURATION, VOTING_THRESHOLD) => {
	return `
  mapping(address => uint256) private stakingBalance;
  mapping(address => uint256) private stakingTimestamp;
  uint256 public constant MIN_STAKING_DURATION = ${MIN_STAKING_DURATION};
  uint256 public constant VOTING_THRESHOLD = ${VOTING_THRESHOLD};
  `
}

const generateCanWithdrawModifier = () => {
	return `
  modifier canWithdraw() {
    require(
        block.timestamp >=
            stakingTimestamp[msg.sender] + MIN_STAKING_DURATION,
        "Cannot withdraw before minimum staking duration which is 2 days."
    );
    _;
  }
  `
}

const generateStakingFunctions = () => {
	return `
  function withdraw(uint256 amount) public canWithdraw {
    require(
        stakingBalance[msg.sender] >= amount,
        "Insufficient staked balance"
    );
    stakingBalance[msg.sender] -= amount;
    stakingTimestamp[msg.sender] = 0; // Reset staking timestamp
    updateDelegate(msg.sender);
    _transfer(address(this), msg.sender, amount); // Transfer staked tokens back to the user
  }

  function getStakedBalance(address addr) public view returns (uint256) {
      return stakingBalance[addr];
  }

  function stake(uint256 amount) public {
      stakingBalance[msg.sender] += amount;
      stakingTimestamp[msg.sender] = block.timestamp; // Set staking timestamp
      updateDelegate(msg.sender);
  }
}`
}

const generateContract = (
	params,
	staking,
	rewards,
	minStakingDuration,
	rewardMultiplier,
	votingThreshold
) => {
	try {
		if (params.votes === false) staking = false
		if (staking) params.votes = true

		let contract = erc20.print(params)

		const lastCurlyBraceIndex = contract.lastIndexOf('}')
		let modifiedContract = ''

		if (rewards) {
			modifiedContract =
				contract.slice(0, lastCurlyBraceIndex) +
				generateRewardMultiplier(rewards, rewardMultiplier) +
				'\n' +
				generateRewardsEvent() +
				'\n' +
				generateTransferFunction(
					params,
					staking,
					rewards,
					minStakingDuration,
					rewardMultiplier
				) +
				'\n' +
				contract.slice(lastCurlyBraceIndex)
		} else {
			modifiedContract =
				contract.slice(0, lastCurlyBraceIndex) +
				generateTransferFunction(
					params,
					staking,
					rewards,
					minStakingDuration,
					rewardMultiplier
				) +
				'\n' +
				contract.slice(lastCurlyBraceIndex)
		}

		const finalContract = modifiedContract.replace(
			'/// @custom:oz-upgrades-unsafe-allow constructor',
			''
		)

		if (staking) {
			const firstCurlyBraceIndex = finalContract.indexOf('{')

			let stakingContract =
				finalContract.slice(0, firstCurlyBraceIndex + 1) +
				generateStakingMapping(minStakingDuration, votingThreshold) +
				generateCanWithdrawModifier() +
				finalContract.slice(firstCurlyBraceIndex + 1)

			const lastCurlyBraceIndex = stakingContract.lastIndexOf('}')

			let fnStakingContract =
				stakingContract.slice(0, lastCurlyBraceIndex) +
				generateStakingFunctions() +
				'\n' +
				finalContract.slice(lastCurlyBraceIndex)

			let updatedTransfer = fnStakingContract.replace(
				'function transfer(address to, uint256 amount) public override {',
				`function transfer(address to, uint256 amount) public {
        require(
            amount <= balanceOf(msg.sender) - getStakedBalance(msg.sender),
            "Insufficient Balance or your balance is staked."
        );

        address from = msg.sender;
        _transfer(from, to, amount);
        updateDelegate(to);

        uint256 rewardAmount = amount / REWARD_MULTIPLIER;
        // Your reward distribution logic here

        emit rewardsTransferred(from, to, rewardAmount);

        return true;
      }`
			)

			contract = updatedTransfer
			return fnStakingContract
		}

		return finalContract
	} catch (err) {
		console.error(err)
	}
}

module.exports = { generateContract }

module.exports = { generateContract }
