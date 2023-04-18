const form = document.querySelector('#message-form');
const textInput = document.querySelector('#text-input');
const fileInput = document.querySelector('#file-input');
const messagesList = document.querySelector('#messages-list');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!textInput.value && !fileInput.files[0]) {
    alert('Введіть текст або завантажте файл');
    return;
  }

  if (fileInput.files[0] && fileInput.files[0].size > 5 * 1024 * 1024) {
    alert('Файл повинен бути менше 5 МБ');
    return;
  }

  try {
    let messageData;
    if (fileInput.files[0]) {
      const formData = new FormData();
      formData.append('file', fileInput.files[0]);
      formData.append('filename', fileInput.files[0].name);
      const response = await fetch('/message/create/file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      messageData = await response.json();
    } else {
      const response = await fetch('/message/create/text', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: textInput.value
        })
      });
      messageData = await response.json();
    }
    const messageHtml = `<li><a href="/message/content?message_id=${messageData.id}">${messageData.content}</a></li>`;
    messagesList.insertAdjacentHTML('afterbegin', messageHtml);
    textInput.value = '';
    fileInput.value = '';
  } catch (error) {
    console.error(error);
    alert('Помилка при створенні повідомлення');
  }
});

async function loadMessages(page = 1, limit = 10) {
  const response = await fetch(`/message/list?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });
  const messagesData = await response.json();
  const messagesHtml = messagesData.map(message => `<li><a href="/message/content?message_id=${message.id}">${message.content}</a></li>`).join('');
  messagesList.innerHTML = messagesHtml;
}

loadMessages();