import FeatCard, { IFeatureCard } from '../_signScreen/FeatCard';

const FeaturesSection = ({ features }: { features: IFeatureCard[] }) => {
  return (
    <div className="tw-mx-auto tw-flex tw-w-full tw-max-w-2xl tw-flex-col tw-gap-4 tw-p-8 xl:tw-p-12">
      {(features ?? []).map((feat, idx) => (
        <div key={idx}>
          {/* A feature without a section title leaves no gap for it. */}
          <h2 className="tw-m-0 tw-mb-3 tw-text-base tw-font-semibold tw-text-foreground empty:tw-hidden">
            {feat.pageTitle}
          </h2>
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
