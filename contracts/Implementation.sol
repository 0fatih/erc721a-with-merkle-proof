// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./ERC721A.sol";

contract Implementation is ERC721A, Ownable {
    // 1 SLOT
    uint16 public constant MAX_SUPPLY = 15; // max 65535
    uint16 public constant PRE_MAX_SUPPLY = 12; // max 65535

    uint64 public PRE_PRICE = 0.001 ether; // max 18,446744073709551615 ether
    uint64 public PUB_PRICE = 0.01 ether; // max 18,446744073709551615 ether

    uint8 private PRE_MAX_NFT_PER_ADDRESS = 4; // max 15
    uint8 private PUB_MAX_NFT_PER_ADDRESS = 5; // max 15 
    
    uint8 private PRE_MAX_NFT_PER_TRANSACTION = 4; // max 15
    uint8 private PUB_MAX_NFT_PER_TRANSACTION = 5; // max 15

    /* If sale:
     * 0, there is no open sale
     * 1, presale is open
     * 2 , public sale is open 
     *
     * It is public because maybe you want to read it from your frontend
     */
    uint8 public SALE;
    // 1 SLOT


    // DO **NOT** FORGET TO CHANGE YOUR MERKLE ROOT
    // Especially, if you deleted setMerkleRoot function
    bytes32 public MERKLE_ROOT = 0x299933cac28b9df1ae6dbf7f5d9814b5fe409a67795ed15dea6135b5fe78c6e3;

    string private PLACEHOLDER = "https://changemeoryouwillbefuckedupforawhile.com";
    string private BASE_URI;
    string private BASE_EXTENSION;

    constructor() ERC721A("Super NFTs", "SNFT") {}

    // if you are using this modifier, then contracts can not mint
    modifier onlyEOA() {
        require(tx.origin == msg.sender, "caller is not an externally owned account");
        _;
    }

    function preMint(uint256 quantity, bytes32[] calldata _merkleProof) external payable onlyEOA {
        require(SALE == 1, "presale is not open");
        require(quantity <= PRE_MAX_NFT_PER_TRANSACTION, "quantity exceeds max quantity per tx");

        require(totalSupply() + quantity <= PRE_MAX_SUPPLY, "quantity exceeds max supply for presale");
        require(msg.value >= PRE_PRICE * quantity, "unsufficient payment");

        uint64 _userAlreadyMinted = _getAux(msg.sender);
        require(_userAlreadyMinted + quantity <= PRE_MAX_NFT_PER_ADDRESS, "quantity exceeds max quantity per address");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(_merkleProof, MERKLE_ROOT, leaf), "invalid proof");

        _setAux(msg.sender, uint64(_userAlreadyMinted + quantity));
        _safeMint(msg.sender, quantity);
    }

    function publicMint(uint256 quantity) external payable onlyEOA {
        require(SALE == 2, "public sale is not open");
        require(quantity <= PUB_MAX_NFT_PER_TRANSACTION, "quantity exceeds max quantity per tx");
        require(balanceOf(msg.sender) + quantity <= PUB_MAX_NFT_PER_ADDRESS + _getAux(msg.sender), "quantity exceeds max quantity per address");
        
        uint256 _totalSupply = totalSupply();
        require(_totalSupply + quantity <= MAX_SUPPLY, "quantity exceeds max supply");
        require(msg.value >= PUB_PRICE * quantity, "unsufficient payment");

        _safeMint(msg.sender, quantity);
    }

    function tokenURI(uint256 tokenId) public view override returns(string memory) {
        if(!_exists(tokenId)) revert URIQueryForNonexistentToken();

        string memory baseURI = BASE_URI;
        return bytes(baseURI).length != 0 ? string(abi.encodePacked(baseURI, _toString(tokenId), BASE_EXTENSION)) : PLACEHOLDER;
    }

    // We want to token ids start from 1, instead 0
    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    // Only Owner functions, you can delete if you don't need any of them
    function withdraw(uint256 _amount) external onlyOwner {
        payable(msg.sender).transfer(_amount);
    }

    function setPubPrice(uint64 _newPrice) external onlyOwner {
        PUB_PRICE = _newPrice;
    }

    function setPrePrice(uint64 _newPrice) external onlyOwner {
        PRE_PRICE = _newPrice;
    }

    function setPubMaxNFTPerAddress(uint8 _newMaxNFTPerAddress) external onlyOwner {
        PUB_MAX_NFT_PER_ADDRESS = _newMaxNFTPerAddress;
    }

    function setPreMaxNFTPerAddress(uint8 _newMaxNFTPerAddress) external onlyOwner {
        PRE_MAX_NFT_PER_ADDRESS = _newMaxNFTPerAddress;
    }

    function setPubMaxNFTPerTransaction(uint8 _newMaxNFTPerTransaction) external onlyOwner {
        PUB_MAX_NFT_PER_TRANSACTION = _newMaxNFTPerTransaction;
    }

    function setPreMaxNFTPerTransaction(uint8 _newMaxNFTPerTransaction) external onlyOwner {
        PRE_MAX_NFT_PER_TRANSACTION = _newMaxNFTPerTransaction;
    }
    
    function setSale(uint8 _newSaleStatus) external onlyOwner {
        SALE = _newSaleStatus;
    }

    function setPlaceHolder(string memory _newPlaceHolder) external onlyOwner {
        PLACEHOLDER = _newPlaceHolder;
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        BASE_URI = _newBaseURI;
    }

    function setBaseExtension(string memory _newBaseExtension) external onlyOwner {
        BASE_EXTENSION = _newBaseExtension;
    }

    function setMerkleRoot(bytes32 _newMerkleRoot) external onlyOwner {
        MERKLE_ROOT = _newMerkleRoot;
    }
}
