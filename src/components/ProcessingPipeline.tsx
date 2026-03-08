import React from 'react';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

interface PipelineStep {
  label: string;
  description: string;
  status: 'idle' | 'active' | 'completed';
}

interface ProcessingPipelineProps {
  steps: PipelineStep[];
}

const ProcessingPipeline: React.FC<ProcessingPipelineProps> = ({ steps }) => {
  return (
    <div className="data-card">
      <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground mb-4">
        Processing Pipeline
      </h3>
      <div className="space-y-0">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`pipeline-step ${step.status}`}
          >
            <div className="absolute left-[-13px] top-0">
              {step.status === 'completed' ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : step.status === 'active' ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/40" />
              )}
            </div>
            <div className="ml-2">
              <p className={`text-sm font-medium ${step.status === 'active' ? 'text-primary' : step.status === 'completed' ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcessingPipeline;
