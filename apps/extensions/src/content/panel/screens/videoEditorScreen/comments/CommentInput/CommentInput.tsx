import { FC, useRef, useState, useEffect } from 'react';
import styles from './CommentInput.module.scss';
import { IComment } from '../CommentElement/CommentElement';

interface ICommentInputProps {
  comment: IComment;
  handleSave: (comment: IComment, newCommentValue: string) => void;
  handleCancel: (commentId: string) => void;
}

const CommentInput: FC<ICommentInputProps> = ({
  comment,
  handleSave,
  handleCancel,
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const disabled = useRef(false);
  const initialValue = useRef(comment.content);
  const [inputValue, setInputValue] = useState(comment.content);

  useEffect(() => {
    if (!ref.current) return;

    ref.current.focus();

    const handleKeyboardEvent = async (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      if (!ref.current) return;

      !disabled.current && handleSave(comment, ref.current.value);

      disabled.current = true;
    };

    ref.current.addEventListener('keydown', (e) => handleKeyboardEvent(e));
  }, [comment, handleSave]);

  return (
    <div className={styles.commentEdit}>
      <input
        ref={ref}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />

      <div className={styles.commentEditButtons}>
        <button onClick={() => handleCancel(comment.id)}>Cancel</button>
        <button
          className={styles.saveButton}
          disabled={initialValue.current === inputValue || inputValue === ''}
          onClick={() => {
            !disabled.current && handleSave(comment, inputValue);
            disabled.current = true;
          }}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default CommentInput;
