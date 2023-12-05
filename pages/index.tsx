import { useState, useEffect } from "react";
import { ethers, Contract } from "ethers";
import { Bastion } from "bastion-wallet-sdk";
import { ParticleNetwork } from "@particle-network/auth";
import { ParticleProvider } from "@particle-network/provider";
import { createPublicClient, createWalletClient, custom } from "viem";
import { polygonMumbai } from "viem/chains";

export default function Home() {
  const [address, setAddress] = useState<string>("");
  const [bastionConnect, setBastionConnect] = useState<any>();
  const [viemConnect, setViemConnect] = useState<any>();
  const [bastionProvider, setBastionProvider] = useState<"ethers" | "viem">();
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [userOpHash, setUserOpHash] = useState<string>("");
  const [smartWalletAddress, setSmartWalletAddress] = useState<string>("");

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAddress(accounts[0]);
      });
    }
  }, []);

  const loginWithMetamask = async (bastionProvider: "ethers" | "viem") => {
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

      if (bastionProvider === "ethers") {
        const provider = new ethers.providers.Web3Provider(
          window.ethereum,
          "any"
        );

        const res = await loginWithBastionEthers(provider);
      }
      if (bastionProvider === "viem") {
        const publicClient = createPublicClient({
          chain: polygonMumbai,
          transport: custom(window.ethereum),
        });

        const walletClient = createWalletClient({
          chain: polygonMumbai,
          transport: custom(window.ethereum),
          account: accounts[0],
        });
        const res = await loginWithBastionViem(publicClient, walletClient);
        console.log(res);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loginWithParticleAuth = async (bastionProvider: "ethers" | "viem") => {
    try {
      const particle = new ParticleNetwork({
        projectId: process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID as string,
        clientKey: process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY as string,
        appId: process.env.NEXT_PUBLIC_PARTICLE_APP_ID as string,
        chainName: "polygon",
        chainId: 80001,
      });

      const userInfo = await particle.auth.login({
        preferredAuthType: "google",
      });
      console.log({ userInfo });
      const particleProvider = new ParticleProvider(particle.auth);
      if (bastionProvider === "ethers") {
        const provider = new ethers.providers.Web3Provider(
          particleProvider,
          "any"
        );
        const isLogin = particle.auth.isLogin();
        console.log({ isLogin });
        const res = await loginWithBastionEthers(provider);
        console.log(res);
      }

      if (bastionProvider === "viem") {
        const [account] = await particleProvider.request({
          method: "eth_accounts",
        });
        console.log("EOA PARTICLE AUTH ADDRESS:", account);

        const publicClient = createPublicClient({
          chain: polygonMumbai,
          transport: custom(particleProvider),
        });

        const walletClient = createWalletClient({
          chain: polygonMumbai,
          transport: custom(particleProvider),
          account,
        });
        const res = await loginWithBastionViem(publicClient, walletClient);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loginWithBastionEthers = async (provider: any) => {
    setBastionProvider("ethers");
    const bastion = new Bastion();
    const bastionConnect = await bastion.bastionConnect;

    const response = await bastionConnect.init(provider, {
      apiKey: process.env.NEXT_PUBLIC_BASTION_API_KEY || "",
    });

    if (!response.exists) {
      await bastionConnect.createSmartAccountByDapp();
    }
    setBastionConnect(bastionConnect);
    const addressResponse = await bastionConnect.getAddress();
    // TODO change when BE changes ethers response
    // const address = addressResponse?.smartAccountAddress
    // setSmartWalletAddress(addressResponse);
    console.log(addressResponse);
    setBastionConnect(bastionConnect);
  };

  const loginWithBastionViem = async (publicClient: any, walletClient: any) => {
    setBastionProvider("viem");
    const bastion = new Bastion();
    const viemConnect = await bastion.viemConnect;
    const CONFIG = {
      chainId: 80001,
      apiKey: process.env.NEXT_PUBLIC_BASTION_API_KEY || "",
    };
    const res = await viemConnect.init(publicClient, walletClient, CONFIG);
    console.log({ res });
    if (!res.exists) {
      const createSmartAccountResult =
        await viemConnect.createSmartAccountByDapp();
    }
    setViemConnect(viemConnect);
    const bastionAddress = await viemConnect.getAddress();
    console.log({ bastionAddress });
    return { viemConnect, bastionAddress: bastionAddress.smartAccountAddress };
  };
  const mintNFT = async () => {
    try {
      setIsMinting(true);
      const contractAddress = "0xEAC57C1413A2308cd03eF3CEa5c9224487825341";
      const contractABI = ["function safeMint(address to) public"];

      const nftContract = new Contract(
        contractAddress,
        contractABI,
        bastionConnect
      );

      const res = await nftContract.safeMint(address);
      await res.wait();
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
          <h4>Smart Wallet - {smartWalletAddress}</h4>
          {isMinting && <h3>Minting...</h3>}
          {userOpHash && <h3>Minted NFT! User Operation Hash: {userOpHash}</h3>}
          <button
            onClick={mintNFT}
            className="rounded-2 bg-gradient-to-r from-[#6C1EB0] to-[#DE389F] mx-4 my-4 px-10 py-4 h-full rounded-xl"
          >
            Mint NFT
          </button>
        </div>
      ) : (
        <div>
          <h1>Welcome to Bastion!</h1>
          <button
            onClick={() => loginWithParticleAuth("ethers")}
            className="rounded-2 bg-gradient-to-r from-[#6C1EB0] to-[#DE389F] mx-4 my-4 px-10 py-4 h-full rounded-xl"
          >
            Login with Particle Auth (Ethers.js)
          </button>
          <button
            onClick={() => loginWithMetamask("ethers")}
            className="rounded-2 bg-gradient-to-r from-[#6C1EB0] to-[#DE389F] mx-4 my-4 px-10 py-4 h-full rounded-xl"
          >
            Login with Metamask (Ethers.js)
          </button>
          <button
            onClick={() => loginWithParticleAuth("viem")}
            className="rounded-2 bg-gradient-to-r from-[#6C1EB0] to-[#DE389F] mx-4 my-4 px-10 py-4 h-full rounded-xl"
          >
            Login with Particle Auth (Viem)
          </button>
          <button
            onClick={() => loginWithMetamask("viem")}
            className="rounded-2 bg-gradient-to-r from-[#6C1EB0] to-[#DE389F] mx-4 my-4 px-10 py-4 h-full rounded-xl"
          >
            Login with Metamask (Viem)
          </button>
        </div>
      )}
    </div>
  );
}
