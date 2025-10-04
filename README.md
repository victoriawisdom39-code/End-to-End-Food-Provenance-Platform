# 🌱 End-to-End Food Provenance Platform

Welcome to a revolutionary blockchain-based platform for tracking food from farm to fork! This project uses the Stacks blockchain to provide transparent, immutable provenance for food products, with a focus on verifying organic claims through on-chain sensor data. Say goodbye to greenwashing and hello to verifiable sustainability.

## ✨ Features

📍 Full supply chain tracking from farm to consumer  
🔍 On-chain verification of organic claims using real-time sensor data (e.g., soil moisture, pesticide levels)  
🌿 Automated certification based on compliance thresholds  
🔒 Immutable records to prevent tampering  
📈 Analytics for stakeholders to monitor trends  
⚖️ Dispute resolution for claims challenges  
🛡️ Role-based access for farmers, distributors, retailers, and auditors  
✅ Consumer-facing QR codes for instant verification  

## 🛠 How It Works

This platform leverages 8 smart contracts written in Clarity to handle various aspects of food provenance and organic verification. Here's a high-level overview:

### Smart Contracts Overview
1. **FarmRegistryContract**: Registers farms with details like location, owner, and certified sensors. Ensures only verified farms can participate.
2. **SensorDataOracleContract**: Interfaces with off-chain sensors (via oracles) to upload and store time-stamped data like temperature, humidity, and chemical usage on-chain.
3. **BatchCreationContract**: Allows farmers to create unique batches of produce, linking them to sensor data and initial metadata (e.g., harvest date).
4. **OrganicCertificationContract**: Automatically evaluates sensor data against organic standards (e.g., no pesticides above thresholds) and issues on-chain certifications.
5. **SupplyChainTrackerContract**: Tracks batch movements through the supply chain, recording transfers between stakeholders with timestamps and signatures.
6. **StakeholderRoleContract**: Manages user roles and permissions, ensuring only authorized parties (e.g., certified distributors) can update chain-of-custody.
7. **VerificationQueryContract**: Provides public functions for anyone to query and verify a batch's provenance, organic status, and full history.
8. **DisputeResolutionContract**: Handles challenges to claims, allowing auditors to review data and resolve disputes with voting or escrow mechanisms.

### For Farmers
- Register your farm using `FarmRegistryContract`.
- Install sensors and connect them via oracles to `SensorDataOracleContract` for ongoing data feeds.
- Create a new batch with `BatchCreationContract`, attaching sensor hashes.
- Submit for certification via `OrganicCertificationContract` – if data complies, get an on-chain badge!

### For Distributors/Retailers
- Use `SupplyChainTrackerContract` to log transfers, ensuring the chain of custody is unbroken.
- Access roles through `StakeholderRoleContract` to update batch status without altering historical data.

### For Consumers/Verifiers
- Scan a QR code linked to a batch ID.
- Call functions in `VerificationQueryContract` to view the full provenance trail, sensor data summaries, and organic certification proof.
- If something seems off, initiate a dispute via `DisputeResolutionContract` for community or expert review.

That's it! Transparent food tracking that's tamper-proof and empowers everyone in the ecosystem. Built on Stacks for scalability and security.