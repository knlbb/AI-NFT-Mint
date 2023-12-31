import { useState, useEffect } from 'react';
import { NFTStorage, File } from 'nft.storage'
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import axios from 'axios';

// Components
import Spinner from 'react-bootstrap/Spinner';
import Navigation from './components/Navigation';

// ABIs
import NFT from './abis/NFT.json'

// Config
import config from './config.json';

function App() {
  const [provider, setProvider] = useState(null)
  const [account, setAccount] = useState(null)
  const [nft, setNFT] = useState(null)

  const [name, setName] = useState("")
  const [desc, setDesc] = useState("")
  const [image, setImage] = useState(null)
  const [url, setURL] = useState(null)
  const [isWaiting, setIsWaiting] = useState(false)
  const [message, setMessage] = useState("")

  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    setProvider(provider)
    
    const network = await provider.getNetwork()
    const nft = new ethers.Contract(config[network.chainId].nft.address, NFT, provider)

    setNFT(nft)

    
  }



  const submitHandler = async (e) => {
    e.preventDefault();

    if (name === "" || desc === "") {
      window.alert("Enter name and desc")
      return 
    }

    setIsWaiting(true)

    console.log("submitting...", name, desc)
    const imageData = createImage()

    const url = await uploadImage(imageData)
    // console.log(url)

    await mintImage(url)

    setIsWaiting(false)

    console.log("success")
  }

  const uploadImage = async (imageData) => {
    setMessage("uploading...")

    const nftStorage = new NFTStorage({token: process.env.REACT_APP_NFT_STORAGE_API_KEY})
    const {ipnft} = await nftStorage.store({
      image: new File([imageData], "image.jpeg", {type: "image/jpeg"}),
      name: name,
      description: desc,
    })
    const url = `https://ipfs.io/ipfs/${ipnft}/metadata.json`
    setURL(url)

    return url
  }

  const createImage = async () => {
    setMessage("Making image...")

    const response = await axios({
      url: `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REACT_APP_HUGGING_FACE_API_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        inputs: desc, options: {wait_for_model: true},
      }),
      responseType: 'arraybuffer',
    })

    const type = response.headers['content-type']
    const data = response.data
    const base64data = Buffer.from(data).toString('base64')
    const img = `data:${type};base64,` + base64data // THIS IS TO RENDER ON PAGE
    setImage(img)

    return data
  }

  const mintImage = async (tokenURI) => {
    setMessage("waiting to mint...")
    
    const signer = await provider.getSigner()
    const transaction = await nft.connect(signer).mint(tokenURI, { value: ethers.utils.parseUnits("1", "ether") })
    await transaction.wait()

  }

  useEffect(() => {
    loadBlockchainData()
  }, [])

  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <div className='form'>
        <form onSubmit={submitHandler}>
          <input type='text' placeholder='Create a name...' onChange={(e) => {setName(e.target.value)}}></input>
          <input type='text' placeholder='Create a description...' onChange={(e) => {setDesc(e.target.value)}}></input>
          <input type='submit' value='Create and Mint'></input>
        </form>
        <div className='image'>
          {!isWaiting  && image ? (
            <img src={image} alt="AI Image"></img>
          ): isWaiting ? (
            <div className='image__placeholder'> 
              <Spinner animation='border'/>
              <p>{message}</p>
            </div>
          ):(
            <></>
          )}
        </div>
      </div>

      { !isWaiting && url && (
        <p>View&nbsp; <a href={url} target='_blank' rel='noreferrer'>Metadata</a></p>
      )}

    </div>
  );
}

export default App;
