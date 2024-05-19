# zkLink Nova Point System

For users on the zkLink Nova network, we will award points. This repository aims to calculate the points users earn based on different types of transactions in various protocols.

If you are a protocol developer on the Nova network and wish for your protocol's users to earn Nova points, please refer to our [adapters documentation](./docs/adapters.md), this document will guide you on how to extend Nova points to your protocol's users.

## Documentation

## Installation

```bash
$ npm run install
```

## Running the app

```bash
# development
$ npm run dev

# watch mode
$ npm run dev:watch

# production mode
$ npm run build && npm run start
```

## Migration

```bash
# generate migration
$ npm run migration:generate --name=<Your Migration Name>

# run migration
$ npm run migration:run
```

## License

[MIT licensed](LICENSE).
