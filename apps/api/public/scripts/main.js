document.addEventListener('DOMContentLoaded', () => {
  const commentsButton = document.querySelector('#leave-main');

  const commentsTextBlock = document.querySelector('.comments-text-box');

  const cancelCommentsButton = document.querySelector('#cancel-comments');

  commentsButton.addEventListener('click', () => {
    const buttonStatus = commentsButton.className;
    if (!buttonStatus.includes('hidden')) {
      commentsButton.classList.add('hidden');
      commentsTextBlock.classList.remove('hidden');
    }
  });

  cancelCommentsButton.addEventListener('click', () => {
    commentsButton.classList.remove('hidden');
    commentsTextBlock.classList.add('hidden');
  });
});

// document.getElementById('commentsForm').addEventListener('submit', (e) => {
//     e.preventDefault()
//     const data = new FormData(e.target)
//     const comment = data.get('comment-textarea')
// })
