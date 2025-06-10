const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Configuring ZKVerifierManager...");
  console.log("Account:", deployer.address);
  
  // Get ZKVerifierManager instance
  const zkVerifierManager = await ethers.getContractAt(
    "ZKVerifierManager", 
    "0x12C07563Adf41439339658f2652540641bFedC0D"
  );
  
  // Use deployer address as mock verifier (for development only)
  const mockVerifierAddress = deployer.address;
  console.log("Using mock verifier address:", mockVerifierAddress);
  
  // Get circuit IDs
  const ACCOUNT_CREATION_CIRCUIT = await zkVerifierManager.ACCOUNT_CREATION_CIRCUIT();
  const ORDER_SUBMISSION_CIRCUIT = await zkVerifierManager.ORDER_SUBMISSION_CIRCUIT();
  const BATCH_EXECUTION_CIRCUIT = await zkVerifierManager.BATCH_EXECUTION_CIRCUIT();
  
  console.log("Configuring verifiers...");
  
  try {
    // Set verifier for account creation
    console.log("Setting account creation verifier...");
    const tx1 = await zkVerifierManager.updateVerifier(ACCOUNT_CREATION_CIRCUIT, mockVerifierAddress);
    await tx1.wait();
    
    // Set verifier for order submission  
    console.log("Setting order submission verifier...");
    const tx2 = await zkVerifierManager.updateVerifier(ORDER_SUBMISSION_CIRCUIT, mockVerifierAddress);
    await tx2.wait();
    
    // Set verifier for batch execution
    console.log("Setting batch execution verifier...");
    const tx3 = await zkVerifierManager.updateVerifier(BATCH_EXECUTION_CIRCUIT, mockVerifierAddress);
    await tx3.wait();
    
    console.log("✅ All verifiers configured!");
    
    // Verify configuration
    const accountVerifier = await zkVerifierManager.verifiers(ACCOUNT_CREATION_CIRCUIT);
    const orderVerifier = await zkVerifierManager.verifiers(ORDER_SUBMISSION_CIRCUIT);
    const batchVerifier = await zkVerifierManager.verifiers(BATCH_EXECUTION_CIRCUIT);
    
    console.log("\n📋 Verification:");
    console.log("Account Creation Verifier:", accountVerifier);
    console.log("Order Submission Verifier:", orderVerifier);
    console.log("Batch Execution Verifier:", batchVerifier);
    
  } catch (error) {
    console.error("Error configuring verifiers:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 