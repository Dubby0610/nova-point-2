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
    address: "0x2DcC88Fa6b6950EE28245C3238B8993BE5feeA42".toLocaleLowerCase(),
    pointsRule: defaultPointsRule,
  },
  {
    id: "symbiosis",
    address: "0x8Dc71561414CDcA6DcA7C1dED1ABd04AF474D189".toLocaleLowerCase(),
    pointsRule: defaultPointsRule,
  },
  {
    id: "owlet",
    address: "0x5e809A85Aa182A9921EDD10a4163745bb3e36284".toLocaleLowerCase(),
    pointsRule: defaultPointsRule,
  },
];
