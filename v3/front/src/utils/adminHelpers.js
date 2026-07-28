import { mergeScoreScale } from '../scoreScaleTemplates'
import { MIN_CRITERIA } from '../constants'

export const clone = (obj) => JSON.parse(JSON.stringify(obj))

export const emptyCriteria = () =>
  Array.from({ length: MIN_CRITERIA }, () => ({ name: '', description: '' }))

export const scoreScaleForTest = (test) =>
  mergeScoreScale(test?.rubric?.scoreScale, {
    defaultLanguage: test?.defaultLanguage,
    title: test?.title,
    brief: test?.brief,
  })
