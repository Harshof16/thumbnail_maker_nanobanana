type Props = {
  currentStep: number;
};

export default function StepIndicator({ currentStep }: Props) {
  const steps = [
    'Upload Photo',
    'Answer Questions', 
    'Generate Thumbnails',
    'Customize & Download'
  ];

  return (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-semibold text-sm
            ${index + 1 <= currentStep
              ? 'bg-red-500 border-red-400 text-white'
              : index + 1 === currentStep + 1
              ? 'border-red-400 text-red-400 bg-red-500/20'
              : 'border-red-300/30 text-red-300/50'
            }`}
          >
            {index + 1}
          </div>
          <span className={`ml-2 text-sm font-medium
            ${index + 1 <= currentStep ? 'text-white' : 'text-red-300/50'}
          `}>
            {step}
          </span>
          {index < steps.length - 1 && (
            <div className={`w-8 h-0.5 mx-4
              ${index + 1 < currentStep ? 'bg-red-500' : 'bg-red-300/30'}
            `} />
          )}
        </div>
      ))}
    </div>
  );
}