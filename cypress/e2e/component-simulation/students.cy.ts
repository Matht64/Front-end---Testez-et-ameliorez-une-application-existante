
function createTestToken(): string {
    const header = btoa(JSON.stringify({
        alg: 'HS256',
        typ: 'JWT'
    }));

    const payload = btoa(JSON.stringify({
        sub: 'cypress-user',
        exp: Math.floor(Date.now() / 1000) + 3600
    }));

    return `${header}.${payload}.test-signature`;
}

function visitStudents(students: any[] = []) {
    cy.intercept('GET', '**/api/students', {
        statusCode: 200,
        body: students
    }).as('getStudents');

    cy.visit('/students', {
        onBeforeLoad: (window) => {
            window.localStorage.setItem('token', createTestToken());
        }
    });

    cy.wait('@getStudents');
}


describe('Student management', () => {

    it('should display the student management page', () => {
        visitStudents();
        cy.contains('Student Management').should('be.visible');
        cy.contains('Add student').should('be.visible');
        cy.contains('Students').should('be.visible');
    });

    it('should display an empty message when there are no students', () => {
        visitStudents();
        cy.contains('No students found').should('be.visible');
    });

    it('should display the student form fields', () => {
        visitStudents();
        cy.get('#firstName').should('be.visible');
        cy.get('#lastName').should('be.visible');
        cy.get('#email').should('be.visible');
        cy.get('#age').should('be.visible');
    });

    it('should display validation errors when submitting an empty form', () => {
        visitStudents();
        cy.contains('button', 'Create').click();

        cy.contains('First name is required.').should('be.visible');
        cy.contains('Last name is required.').should('be.visible');
        cy.contains('Email is required.').should('be.visible');
        cy.contains('Age is required.').should('be.visible');
    });


    it('should create a new student', () => {
        visitStudents();

        cy.intercept('POST', '**/api/students', {
            statusCode: 201,
            body: {
                id: 1,
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@test.com',
                age: 22
            }
        }).as('createStudent');

        cy.get('#firstName').type('John');
        cy.get('#lastName').type('Doe');
        cy.get('#email').type('john.doe@test.com');
        cy.get('#age').type('22');

        cy.contains('button', 'Create').click();

        cy.wait('@createStudent').then((interception) => {
            expect(interception.request.body).to.deep.equal({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@test.com',
                age: 22
            });
        });

        cy.contains('John Doe').should('be.visible');
        cy.contains('Student created successfully.')
            .should('be.visible');
    });


    it('should edit an existing student', () => {
        
        const student = {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@test.com',
            age: 22
        };
        visitStudents([student]);

        // Replace the initial empty-list response.
        cy.intercept('GET', '**/api/students', {
            statusCode: 200,
            body: [student]
        }).as('getExistingStudent');

        cy.visit('/students', {
            onBeforeLoad: (window) => {
                window.localStorage.setItem('token', createTestToken());
            }
        });

        cy.wait('@getExistingStudent');

        cy.contains('John Doe').should('be.visible');

        cy.get('button[aria-label="Edit John"]').click();

        cy.get('#firstName').clear().type('Jonathan');
        cy.get('#age').clear().type('23');

        cy.intercept('PUT', '**/api/students/1', {
            statusCode: 200,
            body: {
                ...student,
                firstName: 'Jonathan',
                age: 23
            }
        }).as('updateStudent');

        cy.contains('button', 'Update').click();

        cy.wait('@updateStudent');

        cy.contains('Jonathan Doe').should('be.visible');
        cy.contains('Student updated successfully.')
            .should('be.visible');
    });


    it('should delete a student after confirmation', () => {

        const student = {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@test.com',
            age: 22
        };

        visitStudents([student]);

        cy.intercept('GET', '**/api/students', {
            statusCode: 200,
            body: [student]
        }).as('getStudents');

        cy.intercept('DELETE', '**/api/students/1', {
            statusCode: 204,
            body: ''
        }).as('deleteStudent');

        cy.visit('/students', {
            onBeforeLoad: (window) => {
                window.localStorage.setItem('token', createTestToken());
            }
        });

        cy.wait('@getStudents');

        cy.on('window:confirm', () => true);

        cy.get('button[aria-label="Delete John"]').click();

        cy.wait('@deleteStudent');

        cy.contains('John Doe').should('not.exist');

        cy.contains('Student deleted successfully.')
            .should('be.visible');
    });


});
