import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Target, Clock, BookOpen, ChevronRight, Award, RotateCcw } from 'lucide-react';

type PlanItem = {
  skillGap: string;
  recommendation: string;
  estimatedHours: number;
  curatedResource: string;
};

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { plan: { learningPlan: PlanItem[] } } | null;

  if (!state?.plan?.learningPlan) return <Navigate to="/" />;

  const { learningPlan } = state.plan;
  const totalHours = learningPlan.reduce((sum, item) => sum + item.estimatedHours, 0);

  return (
    <div className="dashboard-wrap fade-in">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <div className="dashboard-eyebrow">
            <Award size={14} />
            Assessment Complete
          </div>
          <h2 className="dashboard-title">Your Personalized Learning Plan</h2>
          <p className="dashboard-sub">
            {learningPlan.length} skill gaps identified · ~{totalHours} hours to close them
          </p>
        </div>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          <RotateCcw size={15} />
          New Assessment
        </button>
      </div>

      {/* Cards */}
      <div className="plan-grid">
        {learningPlan.map((item, i) => (
          <div key={i} className="plan-card">
            <div className="plan-card-top">
              <span className="skill-chip">
                <Target size={11} />
                Skill Gap
              </span>
              <span className="hours-chip">
                <Clock size={12} />
                {item.estimatedHours}h
              </span>
            </div>

            <h3 className="plan-card-title">{item.skillGap}</h3>

            <p className="plan-card-desc">{item.recommendation}</p>

            <div className="resource-link">
              <span className="resource-label">
                <BookOpen size={11} />
                Recommended Resource
              </span>
              {/* Now using the exact URL provided by the LLM */}
              <a 
                href={item.curatedResource} 
                target="_blank" 
                rel="noopener noreferrer"
                className="resource-name"
                style={{ textDecoration: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                Go to Resource
                <ChevronRight size={16} style={{ marginLeft: '4px' }} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}