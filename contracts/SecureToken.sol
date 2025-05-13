
// File: contracts/SecureToken.sol
pragma solidity ^0.8.17;

interface ISelfHealingManager {
    function isBlacklisted(address account) external view returns (bool);
}

contract SecureToken {
    string public name = "Secure Self-Healing Token";
    string public symbol = "SSHT";
    uint8 public decimals = 18;
    uint256 public totalSupply = 1000000 * 10 ** uint256(decimals);
    
    address public owner;
    address public selfHealingManager;
    
    // For reentrancy protection
    bool private _notEntered = true;
    
    // Token balances
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TransactionDenied(address indexed from, address indexed to, string reason);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // Reentrancy guard
    modifier nonReentrant() {
        require(_notEntered, "ReentrancyGuard: reentrant call");
        _notEntered = false;
        _;
        _notEntered = true;
    }
    
    // Security check modifier
    modifier securityCheck(address _from, address _to) {
        if (selfHealingManager != address(0)) {
            // Check if sender is blacklisted
            if (ISelfHealingManager(selfHealingManager).isBlacklisted(_from)) {
                emit TransactionDenied(_from, _to, "Sender is blacklisted");
                return; // Skip the function body
            }
            
            // Check if recipient is blacklisted
            if (_to != address(0) && ISelfHealingManager(selfHealingManager).isBlacklisted(_to)) {
                emit TransactionDenied(_from, _to, "Recipient is blacklisted");
                return; // Skip the function body
            }
        }
        _;
    }
    
    constructor() {
        owner = msg.sender;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function setSelfHealingManager(address _manager) external onlyOwner {
        selfHealingManager = _manager;
    }
    
    function transfer(address _to, uint256 _value) external nonReentrant securityCheck(msg.sender, _to) returns (bool success) {
        require(_to != address(0), "Transfer to zero address");
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
    
    function approve(address _spender, uint256 _value) external returns (bool success) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
    
    function transferFrom(
        address _from, 
        address _to, 
        uint256 _value
    ) external nonReentrant securityCheck(_from, _to) returns (bool success) {
        require(_to != address(0), "Transfer to zero address");
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Insufficient allowance");
        
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        
        emit Transfer(_from, _to, _value);
        return true;
    }
    
    // Mint new tokens (for testing purposes)
    function mint(address _to, uint256 _value) external onlyOwner {
        require(_to != address(0), "Mint to zero address");
        
        totalSupply += _value;
        balanceOf[_to] += _value;
        
        emit Transfer(address(0), _to, _value);
    }
    
    // Burn tokens
    function burn(uint256 _value) external {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        
        balanceOf[msg.sender] -= _value;
        totalSupply -= _value;
        
        emit Transfer(msg.sender, address(0), _value);
    }
}