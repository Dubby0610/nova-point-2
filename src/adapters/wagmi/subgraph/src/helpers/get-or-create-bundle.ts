import { Bundle } from '../../generated/schema';
import { BIGDECIMAL_ZERO } from '../constants';

const BUNDLE_ID = '1';

export function getOrCreateBundle(): Bundle {
    let bundle = Bundle.load(BUNDLE_ID);
    if (bundle) return bundle;
    bundle = new Bundle(BUNDLE_ID);
    bundle.ethPriceUSD = BIGDECIMAL_ZERO;
    bundle.save();
    return bundle;
}
