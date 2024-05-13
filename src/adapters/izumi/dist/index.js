/* eslint-disable @typescript-eslint/no-var-requires */
const { Web3 } = require("web3");
const fs = require("fs");
const join = require("path").join;
const BigNumber = require("bignumber.js");
const { getLiquidityValue } = require("iziswap-sdk/lib/liquidityManager/calc");

const outputFile = join(__dirname, "../output.csv");
const chainId = "810180";
const rpcUrl = "https://rpc.zklink.network";
const liquidityManagerContract = "0x936c9A1B8f88BFDbd5066ad08e5d773BC82EB15F";
const poolList = [
  "0xd4b701a553005464292e978efd8abc48252a7722", //USDC.Arbi/ETH
  "0x5457c04370c447aed563489d9fe0b1d057439e0b", //usdc/eth
  "0x19142b9d0077eb776d04a4b42a526dd07409b9db", //USDC/USDT
  "0xc2909feb6f46e19f2b40f9288ac63726d7c2612c", //USDT.Arbi/ETH
  "0x062c027e4736f90bb06ba4bfc8036f133fd99413", //USDT/ETH
  "0xe3905d48be8aedb1be57c8ad924c40de7e4fb4ff", //USDT.Eth/ETH
  "0x28592307d115f883acc87763803c3679c0d42fb1", //ETH/USDC.Linea
  "0xe8a8f1d76625b03b787f6ed17bd746e0515f3aef", //USDT/ETH
  // "0x55a367cf8ba4ce47e48e41179de98c549f17a8e5", //USDC.Eth/ETH(err):0
  "0xfa38f432429d59ba653d5746cfea4f734f2c251e", //USDC.Eth/ETH
  // "0x8d8de00231df08c77d85b2540f042dae44d31044", //USDC.Arbi/USDT.Linea(err):0
  "0x25e28398ebd072a2280a2bb5f62d977820be3408", //USDC.ZkSync/USDC.Arbi
  "0xdbd6010d8aae58b229804d1296a0d245bf828365", //USDC.Arbi/USDC.Linea
  "0xbddcbb56e2a7f0370b66d259a29cdcd15bd36ad8", //USDC.Eth/USDC.Arbi
  "0x482cf88e25a7a9ee58761033b777d18198c05d84", //USDC.Arbi/USDC.Manta
  // "0x82b7dbfdc869a529cbcfc89dc384b0222427ff91", //ETH(err):0
  "0x39abf030516e346f6c6779d03b260a4449705ce0", //ETH
  "0xb40805521e976a41028ae3244a2e0b1bb2b768b1", //USDT.Eth/USDC.Eth
  "0xbc2a3ff0ce7413c184086b532bc121318117cacb", //ETH
  "0x57a0c8ba60a7db72d8a19ba1585f7f16e881f08f", //USDT.Arbi/USDC.Arbi
  "0xf6592fee86407a7fa4c2f05c894edadf25c30f57", //USDT.Arbi/USDC.Arbi
  "0x802e9743d3421ce5786bc24aac90bbba404f82dd", //USDC/ETH
  "0x6df75ff0b7fadd001f2c6b87d234ec8b17ca8008"
];
const web3 = new Web3(rpcUrl);
const abi = JSON.parse(fs.readFileSync(join(__dirname, "../abi/LiquidityManagerV2.json"), "utf-8"));
const poolAbi = JSON.parse(fs.readFileSync(join(__dirname, "../abi/pool.abi.json"), "utf-8"));
const erc20Abi = JSON.parse(fs.readFileSync(join(__dirname, "../abi/ERC20.json"), "utf-8"));
const liquidityManager = new web3.eth.Contract(abi, liquidityManagerContract);

async function getPoolState(pool, blockNumber) {
  const {
    sqrtPrice_96,
    currentPoint,
    observationCurrentIndex,
    observationQueueLen,
    observationNextQueueLen,
    liquidity,
    liquidityX,
  } = await pool.methods.state().call({}, blockNumber);
  return {
    sqrtPrice_96: sqrtPrice_96.toString(),
    currentPoint: Number(currentPoint),
    observationCurrentIndex: Number(observationCurrentIndex),
    observationQueueLen: Number(observationQueueLen),
    observationNextQueueLen: Number(observationNextQueueLen),
    liquidity: liquidity.toString(),
    liquidityX: liquidityX.toString(),
  };
}

function decodeMethodResult(contract, methodName, data) {
  const methodAbi = contract.options.jsonInterface.find((abi) => abi.name === methodName && abi.type === "function");
  if (methodAbi && methodAbi.outputs) {
    return web3.eth.abi.decodeParameters(methodAbi.outputs, data);
  } else {
    throw new Error("Method not found or no outputs defined");
  }
}

async function getLiquidities(poolInfos, blockNumber, blockTimestamp) {
  const totalSupply = await liquidityManager.methods.liquidityNum().call({}, blockNumber);
  console.info("totalSupply", totalSupply);

  const batch_size = 10;

  let errorList = [];

  const poolIds = Array.from(poolInfos.keys());
  const result = [];

  async function getLiquiditiesInfo(startId, endId) {
    for (let i = startId; i < endId; i += batch_size) {
      let batchCalls = [];
      let ownerCalls = [];
      let liquidityIds = [];
      let ownershipDict = {};

      for (let j = i; j < Math.min(i + batch_size, Number(totalSupply)); j++) {
        const data = liquidityManager.methods.liquidities(j).encodeABI();
        batchCalls.push(data);
      }

      try {
        const liquidities = await liquidityManager.methods.multicall(batchCalls).call({}, blockNumber);
        liquidities.forEach((t, index) => {
          const data_decoded = decodeMethodResult(liquidityManager, "liquidities", t);
          if (poolIds.includes(data_decoded.poolId) && data_decoded.liquidity != 0) {
            liquidityIds.push({
              id: i + index,
              liquidity: data_decoded.liquidity,
              leftPt: data_decoded.leftPt,
              rightPt: data_decoded.rightPt,
              poolId: data_decoded.poolId,
            });
            const ownerData = liquidityManager.methods.ownerOf(i + index).encodeABI();
            ownerCalls.push(ownerData);
          }
        });

        const owners = await liquidityManager.methods.multicall(ownerCalls).call({}, blockNumber);
        owners.forEach((owner, index) => {
          const owner_d = "0x" + owner.slice(26); //decodeMethodResult(liquidityManager, 'ownerOf', owner)
          const info = liquidityIds[index];
          if (!ownershipDict[owner_d]) {
            ownershipDict[owner_d] = [];
          }
          ownershipDict[owner_d].push(info);
        });

        for (const [owner, lps] of Object.entries(ownershipDict)) {
          for (let lp of lps) {
            const curPoolId = lp.poolId;
            const poolInfo = poolInfos.get(curPoolId);
            const sdkLiquidity = {
              leftPoint: `${lp.leftPt}`,
              rightPoint: lp.rightPt,
              liquidity: lp.liquidity,
              tokenX: poolInfo.tokenX,
              tokenY: poolInfo.tokenY,
            };
            const { amountXDecimal, amountYDecimal } = getLiquidityValue(sdkLiquidity, poolInfo.state);
            const balanceX = BigInt(
              new BigNumber(amountXDecimal)
                .multipliedBy(new BigNumber(10).pow(Number(poolInfo.tokenX.decimal)))
                .toString()
            );
            const balanceY = BigInt(
              new BigNumber(amountYDecimal)
                .multipliedBy(new BigNumber(10).pow(Number(poolInfo.tokenY.decimal)))
                .toString()
            );
            result.push({
              address: owner,
              tokenAddress: poolInfo.tokenX.address,
              pairAddress: poolInfo.address,
              blockNumber: blockNumber,
              balance: balanceX,
            });
            result.push({
              address: owner,
              tokenAddress: poolInfo.tokenY.address,
              pairAddress: poolInfo.address,
              blockNumber: blockNumber,
              balance: balanceY,
            });
          }
        }
      } catch (error) {
        errorList.push(i);
        console.error(`Error fetching batch starting at ${i}:`, error);
      }
      console.info("current process: ", i + batch_size);
    }
  }

  await getLiquiditiesInfo(0, totalSupply);
  if (errorList.length > 0) {
    console.error(`Error fetching batch starting ids:`, errorList);
    const deepCopyErrorList = JSON.parse(JSON.stringify(errorList));
    for (let id of deepCopyErrorList) {
      await getLiquiditiesInfo(id, id + batch_size);
    }
  }
  return result;
}

function writeOutputFile(data) {
  let csvContent = "address,pairAddress,tokenAddress,blockNumber,balance\n";
  // loop data
  for (const item of data) {
    const row = `${item.address},${item.pairAddress},${item.tokenAddress},${item.blockNumber},${item.balance}`;
    csvContent += row + "\n";
  }
  fs.writeFileSync(outputFile, csvContent);
}

async function getUserBalanceByBlock(blockNumber, blockTimestamp) {
  const poolInfos = new Map();
  for (poolAddress of poolList) {
    try {
      const pool = new web3.eth.Contract(poolAbi, poolAddress);
      const poolId = await liquidityManager.methods.poolIds(poolAddress).call();
      const poolMeta = await liquidityManager.methods.poolMetas(poolId).call();
      const tokenXContract = new web3.eth.Contract(erc20Abi, poolMeta.tokenX);
      const tokenYContract = new web3.eth.Contract(erc20Abi, poolMeta.tokenY);
      const tokenXSymbol = await tokenXContract.methods.symbol().call();
      const tokenYSymbol = await tokenYContract.methods.symbol().call();
      const tokenXDecimal = await tokenXContract.methods.decimals().call();
      const tokenYDecimal = await tokenYContract.methods.decimals().call();
      const tokenX = {
        chainId: chainId,
        symbol: tokenXSymbol,
        address: poolMeta.tokenX,
        decimal: tokenXDecimal,
      };

      const tokenY = {
        chainId: chainId,
        symbol: tokenYSymbol,
        address: poolMeta.tokenY,
        decimal: tokenYDecimal,
      };
      const state = await getPoolState(pool, blockNumber);
      poolInfos.set(poolId, { id: poolId, tokenX: tokenX, tokenY: tokenY, state: state, address: poolAddress });
    } catch (error) {
      console.error("Error fetching pool info for poolAddress:", poolAddress);
      continue;
    }
    console.info("pairAddress:", poolAddress);
  }

  const resultTmp = await getLiquidities(poolInfos, blockNumber, blockTimestamp);
  let resultFinal = [];
  // loop resultTmp, group by address, pairAddress, tokenAddress, blockNumber and sum balance
  for (const item of resultTmp) {
    const key = `${item.address}_${item.pairAddress}_${item.tokenAddress}_${item.blockNumber}`;
    if (resultFinal[key]) {
      resultFinal[key].balance += item.balance;
    } else {
      resultFinal[key] = item;
    }
  }
  // return array
  return Object.values(resultFinal);

}

module.exports = {
  getUserBalanceByBlock,
};

// 0x936c9a1b8f88bfdbd5066ad08e5d773bc82eb15f
