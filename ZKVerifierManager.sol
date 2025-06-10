// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.19;

interface IPlonkVerifier {
    function verifyProof(
        bytes memory proof,
        uint256[] memory publicInputs
    ) external view returns (bool);
}

interface IBatchVerifier {
    function verifyBatchExecution(
        bytes memory proof,
        bytes32 oldStateRoot,
        bytes32 newStateRoot,
        bytes32 batchHash
    ) external view returns (bool);
}

/**
 * @title ZKVerifierManager
 * @notice Manages multiple ZK verifiers for different circuit types
 */
contract ZKVerifierManager {
    // Circuit identifiers
    bytes32 public constant ACCOUNT_CREATION_CIRCUIT =
        keccak256("ACCOUNT_CREATION");
    bytes32 public constant ORDER_SUBMISSION_CIRCUIT =
        keccak256("ORDER_SUBMISSION");
    bytes32 public constant BATCH_EXECUTION_CIRCUIT =
        keccak256("BATCH_EXECUTION");

    // Verifier contracts for each circuit
    mapping(bytes32 => address) public verifiers;
    address public governance;

    event VerifierUpdated(bytes32 indexed circuitId, address indexed verifier);

    modifier onlyGovernance() {
        require(msg.sender == governance, "Not governance");
        _;
    }

    constructor(address _governance) {
        governance = _governance;
    }

    /**
     * @notice Update verifier for a specific circuit
     */
    function updateVerifier(
        bytes32 circuitId,
        address verifierAddress
    ) external onlyGovernance {
        require(verifierAddress != address(0), "Invalid verifier");
        verifiers[circuitId] = verifierAddress;
        emit VerifierUpdated(circuitId, verifierAddress);
    }

    /**
     * @notice Verify account creation proof
     */
    function verifyAccountCreation(
        uint256[8] calldata proof,
        address user,
        bytes32 commitment,
        uint256 balance
    ) external view returns (bool) {
        address verifier = verifiers[ACCOUNT_CREATION_CIRCUIT];
        require(verifier != address(0), "Verifier not set");

        uint256[] memory publicInputs = new uint256[](3);
        publicInputs[0] = uint256(uint160(user));
        publicInputs[1] = uint256(commitment);
        publicInputs[2] = balance;

        return
            IPlonkVerifier(verifier).verifyProof(
                abi.encode(proof),
                publicInputs
            );
    }

    /**
     * @notice Verify order submission proof
     */
    function verifyOrderSubmission(
        uint256[8] calldata proof,
        bytes32 nullifier,
        bytes32 commitment,
        bytes32 orderCommitment,
        bytes32 orderDataHash
    ) external view returns (bool) {
        address verifier = verifiers[ORDER_SUBMISSION_CIRCUIT];
        require(verifier != address(0), "Verifier not set");

        uint256[] memory publicInputs = new uint256[](4);
        publicInputs[0] = uint256(nullifier);
        publicInputs[1] = uint256(commitment);
        publicInputs[2] = uint256(orderCommitment);
        publicInputs[3] = uint256(orderDataHash);

        return
            IPlonkVerifier(verifier).verifyProof(
                abi.encode(proof),
                publicInputs
            );
    }

    /**
     * @notice Verify batch execution proof
     */
    function verifyBatchExecution(
        uint256[8] calldata proof,
        bytes32 oldStateRoot,
        bytes32 newStateRoot,
        bytes32 batchHash
    ) external view returns (bool) {
        address verifier = verifiers[BATCH_EXECUTION_CIRCUIT];
        require(verifier != address(0), "Verifier not set");

        return
            IBatchVerifier(verifier).verifyBatchExecution(
                abi.encode(proof),
                oldStateRoot,
                newStateRoot,
                batchHash
            );
    }
}
