import { useState, useEffect } from "react";
import { ethers, Contract } from "ethers";
import { Bastion } from "bastion-wallet-sdk";
import { ParticleNetwork } from "@particle-network/auth";
import { ParticleProvider } from "@particle-network/provider";

export default function Home() {
	const [address, setAddress] = useState<string>("");
	const [bastionConnect, setBastionConnect] = useState<any>();
	const [isMinting, setIsMinting] = useState<boolean>(false);
	const [userOpHash, setUserOpHash] = useState<string>("");

	useEffect(() => {
		if (window.ethereum) {
			window.ethereum.on("accountsChanged", (accounts: string[]) => {
				setAddress(accounts[0]);
			});
		}
	}, []);

	const loginWithMetamask = async () => {
		try {
			// Check if Metamask is installed
			if (!window.ethereum || !window.ethereum.isMetaMask) {
				alert("Please install Metamask.");
				return;
			}

			// Request account access
			const accounts = await window.ethereum.request({
				method: "eth_requestAccounts",
			});

			setAddress(accounts[0]);

			const tempProvider = new ethers.providers.Web3Provider(window.ethereum, "any");

			const bastion = new Bastion();
			const bastionConnect = await bastion.bastionConnect;

			await bastionConnect.init(tempProvider, {
				apiKey: process.env.NEXT_PUBLIC_BASTION_API_KEY || "",
			});

			setBastionConnect(bastionConnect);
		} catch (e) {
			console.error(e);
		}
	};

	const loginWithParticleAuth = async () => {
		try {
			const particle = new ParticleNetwork({
				projectId: process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID as string,
				clientKey: process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY as string,
				appId: process.env.NEXT_PUBLIC_PARTICLE_APP_ID as string,
				chainName: "arbitrum",
				chainId: 421613,
			});

			const userInfo = await particle.auth.login();
			const particleProvider = new ParticleProvider(particle.auth);
			const tempProvider = new ethers.providers.Web3Provider(particleProvider, "any");
			const address = await tempProvider.getSigner().getAddress();
			setAddress(address);

			const bastion = new Bastion();
			const bastionConnect = await bastion.bastionConnect;

			await bastionConnect.init(tempProvider, {
				apiKey: process.env.NEXT_PUBLIC_BASTION_API_KEY || "",
			});

			setBastionConnect(bastionConnect);
		} catch (e) {
			console.error(e);
		}
	};

	const mintNFT = async () => {
		try {
			setIsMinting(true);
			const contractAddress = "0xEAC57C1413A2308cd03eF3CEa5c9224487825341";
			const contractABI = ["function safeMint(address to) public"];

			const nftContract = new Contract(contractAddress, contractABI, bastionConnect);

			const res = await nftContract.safeMint(address);
			console.log(res);
			setIsMinting(false);
			setUserOpHash(res.hash);
		} catch (e) {
			console.error(e);
		}
	};

	return (
		<div>
			{address ? (
				<div>
					<h1>Welcome to Bastion!</h1>
					<h4>Logged in as {address}</h4>
					{isMinting && <h3>Minting...</h3>}
					{userOpHash && <h3>Minted NFT! User Operation Hash: {userOpHash}</h3>}
					<button onClick={mintNFT} className="rounded-2 bg-gradient-to-r from-[#6C1EB0] to-[#DE389F] mx-4 my-4 px-10 py-4 h-full rounded-xl">
						Mint NFT
					</button>
				</div>
			) : (
				<div>
					<h1>Welcome to Bastion!</h1>
					<button onClick={loginWithParticleAuth} className="rounded-2 bg-gradient-to-r from-[#6C1EB0] to-[#DE389F] mx-4 my-4 px-10 py-4 h-full rounded-xl">
						Login with Particle Auth
					</button>
					<button onClick={loginWithMetamask} className="rounded-2 bg-gradient-to-r from-[#6C1EB0] to-[#DE389F] mx-4 my-4 px-10 py-4 h-full rounded-xl">
						Login with Metamask
					</button>
				</div>
			)}
		</div>
	);
}

