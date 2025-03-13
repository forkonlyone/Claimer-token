// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenClaim is ERC20, Ownable {
    uint256 public constant CLAIM_AMOUNT = 100 * 10**18; // 100 tokens
    mapping(address => bool) public hasClaimed;
    uint256 public maxSupply = 1000000 * 10**18; // 1,000,000 tokens
    uint256 public totalClaimed;

    constructor() ERC20("Claim Token", "TKN") {
        _mint(address(this), maxSupply);
    }

    function claim() external {
        require(!hasClaimed[msg.sender], "Already claimed");
        require(totalClaimed + CLAIM_AMOUNT <= maxSupply, "Exceeds max supply");

        hasClaimed[msg.sender] = true;
        totalClaimed += CLAIM_AMOUNT;
        _transfer(address(this), msg.sender, CLAIM_AMOUNT);
    }

    function withdrawUnclaimed() external onlyOwner {
        uint256 balance = balanceOf(address(this));
        _transfer(address(this), owner(), balance);
    }
}