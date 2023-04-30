const { ipcRenderer } = require('electron');
const fs = require('fs');
const pdfMake = require('pdfmake');
const tinymce = require('tinymce');

// Application logic for managing projects, saving to disk, and exporting as PDF

const projectsContainer = document.getElementById('projects-container');
const projectList = document.getElementById('project-list');
const projectDetails = document.getElementById('project-details');
const addProjectButton = document.getElementById('add-project-button');

let projects = [];

function handleImageRightClick(event) {
  event.preventDefault();

  const imagePath = event.target.getAttribute('src');
  if (!imagePath) return;

  window.ipcRenderer.send('show-image-context-menu', imagePath);
}

// Load projects from disk
function loadProjects() {
  const projectsFilePath = getProjectsFilePath();

  if (fs.existsSync(projectsFilePath)) {
    projects = JSON.parse(fs.readFileSync(projectsFilePath));
    displayProjects();
  }
}

// Save projects to disk
function saveProjects() {
  const projectsFilePath = getProjectsFilePath();
  fs.writeFileSync(projectsFilePath, JSON.stringify(projects));
}

// Get the projects file path based on the user's platform
function getProjectsFilePath() {
  const userDataPath = ipcRenderer.sendSync('get-user-data-path');
  return `${userDataPath}/projects.json`;
}

// Display the list of projects
function displayProjects() {
  projectList.innerHTML = '';
  projects.forEach((project, index) => {
    console.log("displayProjects() forEach loop: ", index);
    const listItem = document.createElement('li');
    listItem.textContent = project.title;
    listItem.addEventListener('click', () => displayProjectDetails(index));
    projectList.appendChild(listItem);
  });
}

// Display project details
function displayProjectDetails(index) {
  const project = projects[index];

  // Generate the project details HTML and display it
  projectDetails.innerHTML = `
      <div id="project-details-view">
        <h3 id="main-project-title">${project.title}</h3>
        <p><strong>Contact:</strong> ${project.contact}</p>
        <p><strong>Vendor:</strong> ${project.vendor}</p>
        <p><strong>Vendor Contact:</strong> ${project.vendor_contact}</p>
        <p><strong>Designer:</strong> ${project.designer}</p>
        <p><strong>Production Person:</strong> ${project.production_person}</p>
        <p><strong>Dev URL:</strong> ${project.dev_url}</p>
        <p><strong>Staging URL:</strong> ${project.staging_url}</p>
        <p><strong>Prod URL:</strong> ${project.prod_url}</p>
        <p><strong>Project Type:</strong> ${project.project_type}</p>
        <p><strong>Project Status:</strong> ${project.project_status}</p>
        <p><strong>Drupal Version:</strong> ${project.drupal_version}</p>
        <p><strong>Notes:</strong></p>
        <p>${project.notes}</p>
        <div id="images-wrapper">
            ${project.images && project.images.length
                ? project.images
                    .map(
                    (image, i) => `<div class="image-container">
                        <img src="${image}" alt="Project Image" class="project-image" data-index="${i}" />
                        <button class="delete-image-button" data-index="${i}">Delete Image</button>
                    </div>`
                    )
                    .join('')
                : ''}
        </div>
      </div>
      <div id="project-buttons-wrapper">
        <button id="edit-project-button">Edit</button>
        <button id="delete-project-button">Delete</button>
      </div>
    `;

  projectDetails.classList.remove('hidden');

  tinymce.remove('#notes');

  // Attach event listeners to the edit and delete buttons
  document.getElementById('edit-project-button').addEventListener('click', () => editProject(index));
  document.getElementById('delete-project-button').addEventListener('click', () => deleteProject(index));

  if (project.images && project.images.length) {
    const projectImages = document.querySelectorAll('.project-image');
    projectImages.forEach((projectImage) => {
      projectImage.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const imageIndex = parseInt(event.target.dataset.index);
        ipcRenderer.send('show-item-in-folder', project.images[imageIndex]);
      });
    });
  }

  if (project.images && project.images.length) {
    const deleteImageButtons = document.querySelectorAll('.delete-image-button');
    deleteImageButtons.forEach((deleteImageButton) => {
      deleteImageButton.addEventListener('click', () => {
        const imageIndex = parseInt(deleteImageButton.dataset.index);
        deleteImage(index, imageIndex);
      });
    });
  }
}

// Add a new project
function addProject() {
  console.log("addProject() function called");
  showProjectForm();
  tinymce.init({
    selector: '#notes',
    skin: 'oxide-dark',
    content_css: 'dark'
  });
}

// Edit a project
function editProject(index) {
  const project = projects[index];
  showProjectForm(project, index);
  tinymce.init({
    selector: '#notes',
    skin: 'oxide-dark',
    content_css: 'dark'
  });
}

// Delete a project
function deleteProject(index) {
  projects.splice(index, 1);
  saveProjects();
  displayProjects();
  projectDetails.classList.add('hidden');
}

function handleFormSubmit(isEdit, index, updatedProject) {
    if (isEdit) {
      projects[index] = updatedProject;
    } else {
      projects.push(updatedProject);
    }
    // Retrieve the content of the TinyMCE editor and assign it to the `notes` property
    updatedProject.notes = tinymce.activeEditor.getContent();
    saveProjects();
    displayProjects();
    projectDetails.classList.add('hidden');
    tinymce.remove('#notes');
    console.log("handleFormSubmit() called");
}

  function deleteImage(index, imageIndex) {
    console.log('Image deleted at index: ', imageIndex);
    projects[index].images.splice(imageIndex, 1);
    saveProjects();
    displayProjects();
    displayProjectDetails(index);
  }

// Display the project edit form
function showProjectForm(project = null, index = null) {
  const isEdit = project !== null;

  projectDetails.innerHTML = `
        <h3>${isEdit ? 'Edit' : 'Add'} Project</h3>
        <form id="project-form">
            <label for="title">Title:</label>
            <input type="text" id="title" name="title" value="${project ? project.title : ''}" />
            <br />
            <label for="contact">Contact:</label>
            <input type="text" id="contact" name="contact" value="${project ? project.contact : ''}" />
            <br />
            <label for="vendor">Vendor:</label>
            <input type="text" id="vendor" name="vendor" value="${project ? project.vendor : ''}" />
            <br />
            <label for="vendor_contact">Vendor Contact:</label>
            <input type="text" id="vendor_contact" name="vendor_contact" value="${project ? project.vendor_contact : ''}" />
            <br />
            <label for="designer">Designer:</label>
            <input type="text" id="designer" name="designer" value="${project ? project.designer : ''}" />
            <br />
            <label for="production_person">Production Person:</label>
            <input type="text" id="production_person" name="production_person" value="${project ? project.production_person : ''}" />
            <br />
            <label for="drupal_version">Drupal Version:</label>
            <input type="text" id="drupal_version" name="drupal_version" value="${project ? project.drupal_version : ''}" />
            <br />
            <label for="dev_url">Dev URL:</label>
            <input type="text" id="dev_url" name="dev_url" value="${project ? project.dev_url : ''}" />
            <br />
            <label for="staging_url">Staging URL:</label>
            <input type="text" id="staging_url" name="staging_url" value="${project ? project.staging_url : ''}" />
            <br />
            <label for="prod_url">Prod URL:</label>
            <input type="text" id="prod_url" name="prod_url" value="${project ? project.prod_url : ''}" />
            <br />
            <label for="project_type">Project Type:</label>
            <input type="text" id="project_type" name="project_type" value="${project ? project.project_type : ''}" />
            <br />
            <label for="project_status">Project Status:</label>
            <select id="project_status" name="project_status">
                <option value="To-Do"${project && project.project_status === 'To-Do' ? ' selected' : ''}>To-Do</option>
                <option value="In Progress"${project && project.project_status === 'In Progress' ? ' selected' : ''}>In Progress</option>
                <option value="Canceled"${project && project.project_status === 'Canceled' ? ' selected' : ''}>Canceled</option>
                <option value="Done"${project && project.project_status === 'Done' ? ' selected' : ''}>Done</option>
            </select>
            <br />
            <label for="notes">Notes:</label>
            <textarea id="notes" name="notes">${project ? project.notes : ''}</textarea>
            <br />
            <label for="images">Images:</label>
            <input type="file" id="images" name="images" accept="image/*" multiple />
            <br />
            <div id="images-wrapper">
                ${project && project.images
                ? project.images.map((image, i) => `
                    <div class="image-container">
                        <img src="${image}" alt="Project Image" />
                        <!-- <button class="delete-image-button" data-index="${i}" data-project-index="${index}">Delete</button> -->
                    </div>
                    `).join('')
                : ''}
            </div>
        <br />
        <div id="project-buttons-wrapper">
            <button id="save-add-btn" type="submit">${isEdit ? 'Save' : 'Add'} Project</button>
        </div>
        </form>
    `;

  projectDetails.classList.remove('hidden');

  const projectForm = document.getElementById('project-form');
  projectForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(projectForm);
    const updatedProject = {
      title: formData.get('title'),
      contact: formData.get('contact'),
      vendor: formData.get('vendor'),
      vendor_contact: formData.get('vendor_contact'),
      drupal_version: formData.get('drupal_version'),
      notes: formData.get('notes'),
      designer: formData.get('designer'),
      production_person: formData.get('production_person'),
      dev_url: formData.get('dev_url'),
      staging_url: formData.get('staging_url'),
      prod_url: formData.get('prod_url'),
      project_type: formData.get('project_type'),
      project_status: formData.get('project_status'),
    };

    // Inside the projectForm event listener
    const imagesInput = document.getElementById('images');
    if (imagesInput.files.length > 0) {
    updatedProject.images = project ? (project.images || []) : [];
    const totalImages = imagesInput.files.length;
    let loadedImages = 0;

    Array.from(imagesInput.files).forEach((file) => {
        const fileReader = new FileReader();
        fileReader.onload = () => {
        updatedProject.images.push(fileReader.result);
        loadedImages++;

        if (loadedImages === totalImages) {
            handleFormSubmit(isEdit, index, updatedProject);
        }
        };
        fileReader.readAsDataURL(file);
    });
    } else {
    updatedProject.images = project ? project.images : [];
    handleFormSubmit(isEdit, index, updatedProject);
    }

    // handleFormSubmit(isEdit, index, updatedProject);

    saveProjects();
    
    displayProjects();
    projectDetails.classList.add('hidden');
  });
}

    document.addEventListener('contextmenu', (event) => {
    if (event.target.tagName.toLowerCase() === 'img') {
      handleImageRightClick(event);
    }
  });

// Load projects when the application starts
loadProjects();

// Add event listener to the add project button
addProjectButton.addEventListener('click', addProject);

// Add this to the bottom of the renderer.js file, after the last event listener
const userDataPathElement = document.getElementById('user-data-path');
userDataPathElement.textContent = `Data saved in: ${ipcRenderer.sendSync('get-user-data-path')}`;

function updateTheme() {
  const isDarkMode = true;
  // const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  // document.body.dataset.theme = isDarkMode ? 'dark' : 'light';
  document.body.dataset.theme = isDarkMode ? 'dark' : 'dark';
}

updateTheme();

// window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme);

document.getElementById('restart-button').addEventListener('click', () => {
  ipcRenderer.send('restart-app');
});