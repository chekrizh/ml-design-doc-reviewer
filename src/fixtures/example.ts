// The example design: Supermegaretail Demand Forecasting from the Library (replaces M1's Churn Prediction).
// Used by "Load example" and by the e2e tests.
import { libraryDesign } from './library'

export const EXAMPLE_ID = 'retail-demand-forecasting'
export const TASK_ID = 'superpay-fraud-detection'

export const exampleDesign = () => libraryDesign(EXAMPLE_ID)
