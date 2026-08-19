import { mergeScoreScale } from '../../scoreScaleTemplates'
import { SCORE_LEVELS } from '../../constants'
import { scoreScaleForTest } from '../../utils/adminHelpers'

function ScoreScaleReadonly({ scoreScale, test }) {
  const scale = test ? scoreScaleForTest(test) : mergeScoreScale(scoreScale)
  return (
    <div className="score-scale-block">
      <h3>Escala de calificación (0–5)</h3>
      <ul className="score-scale-list">
        {SCORE_LEVELS.map((level) => (
          <li key={level}>
            <span className="level">{level}</span>
            <span>{scale[level] || '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ScoreScaleReadonly
