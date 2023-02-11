// https://ton.org/docs/develop/onboarding-challenge
import {Address, TonClient , toNano} from "ton"
import {BN} from 'bn.js'
import {unixNow} from "./src/lib/utils";
import {MineMessageParams, Queries} from "./src/giver/NftGiver.data";

const qrcode = require('qrcode-terminal');

const YOUR_WALLET_ADDRESS = "EQAuaXJ2e-ZW86qHiCMzisiZFG1AOfh7o2LmtnC5EiEFYTAM";

// https://testnet.getgems.io/collection/EQD6kg2l9r0A38_UT2ISYmLjzrUW7wU7uinsPtF5yWaJ0VdL
//const COLLECTION_ADDRESS = "EQD6kg2l9r0A38_UT2ISYmLjzrUW7wU7uinsPtF5yWaJ0VdL";
const COLLECTION_ADDRESS = "EQDk8N7xM5D669LC2YACrseBJtDyFqwtSPCNhRWXU7kjEptX";

// https://t.me/tonapibot
// https://www.whatismyip.com/
const YOUR_API_KEY = "67d0b5abb18135b235302a94f9e47303ddfe14c5bbb1c2e35dc9485baa2d3438";

async function main () {

  const wallet = Address.parse(YOUR_WALLET_ADDRESS);
  const collection = Address.parse(COLLECTION_ADDRESS);

  const client = new TonClient({
    endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    apiKey: YOUR_API_KEY,
  });

  const miningData = await client.callGetMethod(collection, 'get_mining_data');
  console.log("Mining data:",miningData);
  //console.log(miningData)
  
  const parseStackNum = (sn: any) => new BN(sn[1].substring(2), 'hex');

  const complexity = parseStackNum(miningData.stack[0]);
  const last_success = parseStackNum(miningData.stack[1]);
  const seed = parseStackNum(miningData.stack[2]);
  const target_delta = parseStackNum(miningData.stack[3]);
  const min_cpl = parseStackNum(miningData.stack[4]);
  const max_cpl = parseStackNum(miningData.stack[5]);

  console.log('complexity', complexity);
  console.log('last_success', last_success.toString());
  console.log('seed', seed);
  console.log('target_delta', target_delta.toString());
  console.log('min_cpl', min_cpl.toString());
  console.log('max_cpl', max_cpl.toString());

  const mineParams : MineMessageParams = {
    expire: unixNow() + 300, // 5 min is enough to make a transaction
    mintTo: wallet, // your wallet
    data1: new BN(0), // temp variable to increment in the miner
    seed // unique seed from get_mining_data
  };

  let msg = Queries.mine(mineParams);
  let progress = 0;

  while (new BN(msg.hash(), 'be').gt(complexity)) {
    progress += 1
    console.clear()
    console.log(`Mining started: please, wait for 30-60 seconds to mine your NFT!`)
    console.log(' ')
    console.log(`⛏ Mined ${progress} hashes! Last: `, new BN(msg.hash(), 'be').toString())

    mineParams.expire = unixNow() + 300
    mineParams.data1.iaddn(1)
    msg = Queries.mine(mineParams)
  }

  console.log(' ')
  console.log('💎 Mission completed: msg_hash less than pow_complexity found!');
  console.log(' ')
  console.log('msg_hash: ', new BN(msg.hash(), 'be').toString())
  console.log('pow_complexity: ', complexity.toString())
  console.log('msg_hash < pow_complexity: ', new BN(msg.hash(), 'be').lt(complexity))
  
  console.log(' ');
  console.log("💣 WARNING! As soon as you find the hash, you should quickly make a transaction.");
  console.log("If someone else makes a transaction, the seed changes, and you have to find a hash again!");
  console.log(' ');

  // flags work only in user-friendly address form
  const collectionAddr = collection.toFriendly({
    urlSafe: true,
    bounceable: true,
  })
  // we must convert TON to nanoTON
  const amountToSend = toNano('0.05').toString()
  // BOC means Bag Of Cells here
  const preparedBodyCell = msg.toBoc().toString('base64url')

  // final method to build a payment url
  const tonDeepLink = (address: string, amount: string, body: string) => {
    return `ton://transfer/${address}?amount=${amount}&bin=${body}`;
  };

  const link = tonDeepLink(collectionAddr, amountToSend, preparedBodyCell);

  console.log('🚀 Link to receive an NFT:')
  console.log(link);

  qrcode.generate(link, {small: true}, function (qrcode : any) {
    console.log('🚀 Link to mine your NFT (use Tonkeeper in testnet mode):')
    console.log(qrcode);
    console.log('* If QR is still too big, please run script from the terminal. (or make the font smaller)')
  });
  
}

main()

