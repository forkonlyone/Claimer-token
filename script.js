document.addEventListener('DOMContentLoaded', () => {
    const connectWalletBtn = document.getElementById('connectWallet');
    const claimButton = document.getElementById('claimButton');
    const statusDiv = document.getElementById('status');
    const walletInfoDiv = document.getElementById('walletInfo');
    const walletAddressSpan = document.getElementById('walletAddress');

    let userWalletAddress = null;
    let hasUserClaimed = false; // Track if user has claimed

    // Check if MetaMask is installed
    const isMetaMaskInstalled = () => {
        return typeof window.ethereum !== 'undefined';
    };

    // Add contract configuration at the top level
    const CONTRACT_ADDRESS = '0x123...'; // Replace with your actual contract address
    const CONTRACT_ABI = [
        {
            "inputs": [],
            "name": "claim",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
            "name": "hasClaimed",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        }
    ];

    let contract = null;
    
    // Initialize contract after wallet connection
    async function initializeContract() {
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum, {
                name: 'Binance Smart Chain',
                chainId: 56,
                ensAddress: null // Explicitly set ENS to null for BSC
            });
            const signer = provider.getSigner();
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        } catch (error) {
            console.error("Contract initialization error:", error);
            showStatus('Failed to initialize contract', 'error');
        }
    }

    // Add network configuration at the top
    const NETWORK_CONFIG = {
        chainId: '0x38', // BSC Mainnet
        rpcUrl: 'https://bsc-dataseed.binance.org/',
        networkName: 'BSC Mainnet',
        nativeCurrency: {
            symbol: 'BNB',
            decimals: 18
        }
    };

    // Handle account change
    function handleAccountChange(accounts) {
        if (accounts.length === 0) {
            // User disconnected their wallet
            resetWalletConnection();
        } else {
            userWalletAddress = accounts[0];
            connectWalletBtn.textContent = `Connected: ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
            showStatus('Account changed successfully!', 'success');
        }
    }
    
    // Handle network change
    // Update handleChainChange function
    function handleChainChange(chainId) {
        if (chainId !== NETWORK_CONFIG.chainId) {
            showStatus(`Please switch to ${NETWORK_CONFIG.networkName}`, 'error');
            claimButton.disabled = true;
        } else {
            claimButton.disabled = false;
        }
    }
    
    // Reset wallet connection
    function resetWalletConnection() {
        userWalletAddress = null;
        hasUserClaimed = false; // Reset claim status
        walletInfoDiv.style.display = 'none';
        connectWalletBtn.textContent = 'Connect Wallet';
        connectWalletBtn.disabled = false;
        claimButton.disabled = true;
        showStatus('Wallet disconnected', 'error');
    }
    
    // Connect Wallet function
    async function connectWallet() {
        if (!isMetaMaskInstalled()) {
            showStatus('Please install MetaMask to continue', 'error');
            return;
        }

        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            const chainId = await window.ethereum.request({
                method: 'eth_chainId'
            });

            // Network switching logic
            if (chainId !== NETWORK_CONFIG.chainId) {
                showStatus(`Switching to ${NETWORK_CONFIG.networkName}...`, 'processing');
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: NETWORK_CONFIG.chainId }],
                    });
                } catch (switchError) {
                    if (switchError.code === 4902) {
                        try {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [{
                                    chainId: NETWORK_CONFIG.chainId,
                                    chainName: NETWORK_CONFIG.networkName,
                                    rpcUrls: [NETWORK_CONFIG.rpcUrl],
                                    nativeCurrency: NETWORK_CONFIG.nativeCurrency,
                                }],
                            });
                        } catch (addError) {
                            showStatus(`Failed to add ${NETWORK_CONFIG.networkName}: ${addError.message}`, 'error');
                            return;
                        }
                    } else {
                        showStatus(`Failed to switch to ${NETWORK_CONFIG.networkName}: ${switchError.message}`, 'error');
                        return;
                    }
                }
            }

            userWalletAddress = accounts[0];
            await initializeContract();
            connectWalletBtn.textContent = `Connected: ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
            connectWalletBtn.disabled = true;
            claimButton.disabled = false;
            showStatus('Wallet connected successfully!', 'success');

            window.ethereum.on('accountsChanged', handleAccountChange);
            window.ethereum.on('chainChanged', handleChainChange);
        } catch (error) {
            showStatus('Failed to connect wallet: ' + error.message, 'error');
        }
    }

    // Connect wallet button event
    connectWalletBtn.addEventListener('click', connectWallet);
    const balanceDisplay = document.querySelector('.balance');
    let totalBalance = 1000000; // Initial balance
    
    // Update the balance display
    function updateBalance(claimedAmount) {
        totalBalance -= claimedAmount;
        balanceDisplay.textContent = `${totalBalance.toLocaleString()} TKN`;
    }
    
    // Modified claim button event
    claimButton.addEventListener('click', async () => {
        if (!userWalletAddress) {
            showStatus('Please connect your wallet first', 'error');
            return;
        }

        try {
            showStatus('Processing claim...', 'processing');
            claimButton.disabled = true;

            // Call contract claim function
            const tx = await contract.claim();
            showStatus('Waiting for transaction confirmation...', 'processing');
            
            // Wait for transaction confirmation
            await tx.wait();

            hasUserClaimed = true;
            updateBalance(fixedAmount);
            showStatus(`Successfully claimed tokens! TX: ${tx.hash}`, 'success');
            claimButton.disabled = true;
            claimButton.classList.add('disabled-button');
        } catch (error) {
            showStatus('Transaction failed: ' + error.message, 'error');
            if (!hasUserClaimed) {
                claimButton.disabled = false;
                claimButton.classList.remove('disabled-button');
            }
        }
    });
    
    // Modified reset wallet connection
    function resetWalletConnection() {
        userWalletAddress = null;
        hasUserClaimed = false; // Reset claim status
        walletInfoDiv.style.display = 'none';
        connectWalletBtn.textContent = 'Connect Wallet';
        connectWalletBtn.disabled = false;
        claimButton.disabled = true;
        showStatus('Wallet disconnected', 'error');
    }
    
    // Show status messages
    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + type;
    }
    
    // Simulate blockchain transaction
    function simulateTransaction() {
        return new Promise((resolve) => {
            setTimeout(resolve, 2000);
        });
    }
    
    // Check if wallet is already connected on page load
    async function checkWalletConnection() {
        if (isMetaMaskInstalled()) {
            try {
                const accounts = await window.ethereum.request({
                    method: 'eth_accounts'
                });
                if (accounts.length > 0) {
                    userWalletAddress = accounts[0];
                    connectWalletBtn.textContent = `Connected: ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`;
                    connectWalletBtn.disabled = true;
                    claimButton.disabled = false;
                }
            } catch (error) {
                console.error('Error checking wallet connection:', error);
            }
        }
    }
    
    // Check wallet connection on page load
    checkWalletConnection();
});