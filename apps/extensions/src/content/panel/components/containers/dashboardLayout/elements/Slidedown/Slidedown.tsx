import React, { Component, forwardRef } from 'react';
//@ts-ignore
import * as styles from './Slidedown.module.scss';
import classNames from 'classnames';

// THis is the component copied from the library. Dont ask. Just use.
interface SlideDownContentProps extends SlideDownProps {
  forwardedRef: React.Ref<HTMLDivElement> | null;
}

interface SlideDownContentState {
  children: React.ReactNode;
  childrenLeaving: boolean;
}

class SlideDownContent extends Component<
  SlideDownContentProps,
  SlideDownContentState
> {
  static defaultProps = {
    transitionOnAppear: true,
    closed: false,
  };

  private outerRef: HTMLDivElement | null = null;

  constructor(props: SlideDownContentProps) {
    super(props);

    this.state = {
      children: props.children,
      childrenLeaving: false,
    };
  }

  private handleRef = (ref: HTMLDivElement | null) => {
    /* Handle both the internal and forwardedRef and maintain correct typings */
    this.outerRef = ref;

    if (this.props.forwardedRef) {
      if (typeof this.props.forwardedRef === 'function') {
        this.props.forwardedRef(ref);
      } else if (typeof this.props.forwardedRef === 'object') {
        const forwardedRef = this.props.forwardedRef as any;
        forwardedRef.current = ref;
      } else {
        throw new Error(`Invalid forwardedRef ${this.props.forwardedRef}`);
      }
    }
  };

  componentDidMount() {
    if (this.outerRef) {
      if (this.props.closed || !this.props.children) {
        this.outerRef.classList.add(styles.closed);
        this.outerRef.style.height = '0px';
      } else if (this.props.transitionOnAppear) {
        this.startTransition('0px');
      } else {
        this.outerRef.style.height = 'auto';
      }
    }
  }

  getSnapshotBeforeUpdate() {
    /* Prepare to resize */
    return this.outerRef
      ? this.outerRef.getBoundingClientRect().height + 'px'
      : null;
  }

  static getDerivedStateFromProps(
    props: SlideDownContentProps,
    state: SlideDownContentState,
  ) {
    if (props.children) {
      return {
        children: props.children,
        childrenLeaving: false,
      };
    } else if (state.children) {
      return {
        children: state.children,
        childrenLeaving: true,
      };
    } else {
      return null;
    }
  }

  componentDidUpdate(
    _prevProps: any,
    _prevState: any,
    snapshot: string | null,
  ) {
    if (this.outerRef && snapshot) {
      this.startTransition(snapshot);
    }
  }

  private startTransition(prevHeight: string) {
    let endHeight = '0px';

    if (
      !this.props.closed &&
      !this.state.childrenLeaving &&
      this.state.children &&
      this.outerRef
    ) {
      this.outerRef.classList.remove(styles.closed);
      this.outerRef.style.height = 'auto';
      endHeight = getComputedStyle(this.outerRef).height;
    }

    if (
      parseFloat(endHeight).toFixed(2) !== parseFloat(prevHeight).toFixed(2) &&
      this.outerRef
    ) {
      this.outerRef.classList.add(styles.transitioning);
      this.outerRef.style.height = prevHeight;
      this.outerRef.offsetHeight; // force repaint
      this.outerRef.style.transitionProperty = 'height';
      this.outerRef.style.height = endHeight;
      this.outerRef.style.width = '100%';
    }
  }

  private endTransition() {
    if (this.outerRef) {
      this.outerRef.classList.remove(styles.transitioning);
      this.outerRef.style.transitionProperty = 'none';
      this.outerRef.style.height = this.props.closed ? '0px' : 'auto';

      if (this.props.closed || !this.state.children) {
        this.outerRef.classList.add('closed');
      }
    }
  }

  private handleTransitionEnd = (evt: React.TransitionEvent) => {
    if (evt.target === this.outerRef && evt.propertyName === 'height') {
      if (this.state.childrenLeaving) {
        this.setState({ children: null, childrenLeaving: false }, () =>
          this.endTransition(),
        );
      } else {
        this.endTransition();
      }
    }
  };

  render() {
    const {
      as = 'div',
      children,
      className,
      closed,
      transitionOnAppear,
      forwardedRef,
      ...rest
    } = this.props;
    const containerClassName = classNames(styles['react-slidedown'], className);

    return React.createElement(
      as,
      {
        ref: this.handleRef,
        className: containerClassName,
        onTransitionEnd: this.handleTransitionEnd,
        ...rest,
      },
      this.state.children,
    );
  }
}

const SlideDownContentReact = SlideDownContent as any;

interface SlideDownProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>;
  closed?: boolean;
  transitionOnAppear?: boolean;
}

export const SlideDown = forwardRef(
  (props: SlideDownProps, ref: React.Ref<HTMLDivElement>) => (
    <SlideDownContentReact {...props} forwardedRef={ref} />
  ),
);

export default SlideDown;
