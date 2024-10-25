import FeatCard, { IFeatureCard } from '../_signScreen/FeatCard';

const FeaturesSection = ({ features }: { features: IFeatureCard[] }) => {
  return (
    <div className="tw-p-20">
      {(features ?? []).map((feat, idx) => (
        <div key={idx}>
          <h2 className="tw-font-bold tw-text-2xl">{feat.pageTitle}</h2>
          <FeatCard
            imgPath={feat.imgPath}
            title={feat.title}
            date={feat.date}
            description={feat.description}
            rightImgPath={feat.rightImgPath}
            buttonText={feat.buttonText}
            id={feat.id}
            priority={feat.priority}
          />
        </div>
      ))}
    </div>
  );
};

export default FeaturesSection;
