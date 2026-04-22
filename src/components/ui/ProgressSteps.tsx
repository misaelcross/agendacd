interface ProgressStepsProps {
  steps: string[]
  activeStep: number  // 0-indexed
}

export function ProgressSteps({ steps, activeStep }: ProgressStepsProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full">
      {steps.map((label, idx) => {
        const isDone   = idx < activeStep
        const isActive = idx === activeStep
        const isLast   = idx === steps.length - 1

        return (
          <div key={idx} className="flex items-center">
            {/* Step dot + label */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  'flex items-center justify-center rounded-full transition-all font-bold text-xs',
                  isDone
                    ? 'w-6 h-6 bg-green-600 text-white'
                    : isActive
                    ? 'w-7 h-7 bg-green-600 text-white ring-4 ring-green-100'
                    : 'w-6 h-6 bg-gray-200 text-gray-400',
                ].join(' ')}
              >
                {isDone ? '✓' : idx + 1}
              </div>
              <span
                className={[
                  'text-[10px] font-medium leading-tight text-center max-w-[60px] transition-all',
                  isActive ? 'text-green-700' : isDone ? 'text-green-600' : 'text-gray-400',
                  !isActive && 'sr-only',
                ].join(' ')}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={[
                  'h-0.5 w-8 mx-1 rounded transition-colors',
                  idx < activeStep ? 'bg-green-500' : 'bg-gray-200',
                ].join(' ')}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
