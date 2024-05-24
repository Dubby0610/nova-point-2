const defaultPointsRule = [
  {
    start: 0,
    end: 200,
    points: 5,
  },
  {
    start: 201,
    end: 400,
    points: 4,
  },
  {
    start: 401,
    end: 600,
    points: 3,
  },
  {
    start: 601,
    end: 800,
    points: 2,
  },
  {
    start: 801,
    end: 0,
    points: 1,
  },
];

export default [
  {
    id: "meson",
    addresses: ["0x2DcC88Fa6b6950EE28245C3238B8993BE5feeA42".toLocaleLowerCase()],
    pointsRule: defaultPointsRule,
  },
  {
    // symbiosis-weth
    id: "symbiosis",
    addresses: [
      "0x8Dc71561414CDcA6DcA7C1dED1ABd04AF474D189".toLocaleLowerCase(), //weth
      "0xd17Ee77a10376Dab561d947F5e5FC5cf6de67441".toLocaleLowerCase(), //eth

    ],
    pointsRule: defaultPointsRule,
  },
  //   {
  //     id: "owlet",
  //     addresses: ["0x5e809A85Aa182A9921EDD10a4163745bb3e36284".toLocaleLowerCase()],
  //     pointsRule: defaultPointsRule,
  //   },
  {
    id: "orbiter",
    addresses: [
      "0x80c67432656d59144ceff962e8faf8926599bcf8".toLocaleLowerCase(), // eth
      "0xe4edb277e41dc89ab076a1f049f4a3efa700bce8".toLocaleLowerCase(), // eth
      "0xee73323912a4e3772b74ed0ca1595a152b0ef282".toLocaleLowerCase(), // eth
      "0x41d3d33156ae7c62c094aae2995003ae63f587b3".toLocaleLowerCase(), // usdc
      "0xd7aa9ba6caac7b0436c91396f22ca5a7f31664fc".toLocaleLowerCase(), // usdt
    ],
    pointsRule: defaultPointsRule,
  },
];


