
const API_URL = 'http://localhost:8080/api';

// A different account is created for every test.
let testUser: {
    firstName: string;
    lastName: string;
    login: string;
    password: string;
};

function createStudent() {
    return {
        firstName: 'Cypress',
        lastName: 'TestStudent',
        email: `student_${Date.now()}@test.com`,
        age: 22
    };
}

// Creates an account, logs in and opens the students page.
function loginAndVisitStudents(): Cypress.Chainable<string> {

    return cy.request('POST', `${API_URL}/register`, testUser)
        .then((registerResponse) => {

            expect(registerResponse.status).to.be.within(200, 299);

            return cy.request({
                method: 'POST',
                url: `${API_URL}/login`,
                body: {
                    login: testUser.login,
                    password: testUser.password
                }
            });

        })
        .then((response) => {

            expect(response.status).to.equal(200);

            const token = response.body.trim();

            expect(token).to.be.a('string').and.not.be.empty;

            // Observe the initial request before visiting the page.
            cy.intercept('GET', '**/api/students').as('getStudents');

            return cy.visit('/students', {
                onBeforeLoad: (window) => {
                    window.localStorage.setItem('token', token);
                }
            }).then(() => token);

        });
}


describe('Real student management', () => {

    let token: string;
    let createdStudentId: number | null = null;

    // Prepare a new authenticated user before every test.
    beforeEach(() => {

        testUser = {
            firstName: 'Cypress',
            lastName: 'StudentTester',
            login: `students_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            password: 'TestPassword123!'
        };

        return loginAndVisitStudents().then((jwt) => {

            token = jwt;

            // Wait until the students page has loaded its data.
            return cy.wait('@getStudents');

        });

    });


    // Remove the student created by a test, even if an assertion fails.
    afterEach(() => {

        if (createdStudentId !== null) {

            cy.request({
                method: 'DELETE',
                url: `${API_URL}/students/${createdStudentId}`,
                headers: {
                    Authorization: `Bearer ${token}`
                },
                failOnStatusCode: false
            }).then(() => {

                createdStudentId = null;

            });

        }

    });


    // READ
    it('should display students from the real database', () => {

        cy.contains('Student Management').should('be.visible');

        // The database can contain students or be empty.
        cy.get('table tbody tr, .empty-state')
            .should('exist');

    });


    // CREATE, UPDATE AND DELETE
    it('should create, update and delete a student', () => {

        const student = createStudent();

        // CREATE
        cy.intercept('POST', '**/api/students').as('createStudent');

        cy.get('#firstName').type(student.firstName);
        cy.get('#lastName').type(student.lastName);
        cy.get('#email').type(student.email);
        cy.get('#age').type(String(student.age));

        cy.contains('button', 'Create').click();

        cy.wait('@createStudent').then((interception) => {

            expect(interception.response!.statusCode)
                .to.be.oneOf([200, 201]);

            const studentId = interception.response!.body.id;

            expect(studentId).to.be.a('number');

            // Save the ID for afterEach cleanup.
            createdStudentId = studentId;

            // UPDATE
            cy.intercept('PUT', `**/api/students/${studentId}`)
                .as('updateStudent');

            cy.get(
                `button[aria-label="Edit ${student.firstName} ${studentId}"]`
            ).click();

            cy.get('#firstName').clear().type('UpdatedStudent');
            cy.get('#age').clear().type('25');

            cy.contains('button', 'Update').click();

            cy.wait('@updateStudent').then((updateInterception) => {

                expect(updateInterception.response!.statusCode)
                    .to.be.oneOf([200, 201]);

                expect(updateInterception.request.body.firstName)
                    .to.equal('UpdatedStudent');

                expect(updateInterception.request.body.age)
                    .to.equal(25);

            });

            //     // DELETE

            //     cy.intercept('DELETE', `${API_URL}/students/${studentId}`)
            //         .as('deleteStudent');

            //     // Automatically accept the browser confirmation.
            //     cy.on('window:confirm', (message) => {
            //         expect(message).to.contain('UpdatedStudent');
            //         return true;
            //     });

            //     // Find the exact Delete button.
            //     cy.get(
            //         `button[aria-label="Delete UpdatedStudent ${studentId}"]`
            //     )
            //         .should('be.visible')
            //         .and('be.enabled')
            //         .click();

            //     // Wait for the real backend response.
            //     cy.wait('@deleteStudent').then((interception) => {

            //         expect(interception.response).to.exist;

            //         expect(interception.response!.statusCode)
            //             .to.be.oneOf([200, 204]);

            //     });

            //     // Verify that the student disappeared from the interface.
            //     cy.contains('UpdatedStudent TestStudent')
            //         .should('not.exist');

            //     cy.contains('Student deleted successfully.')
            //         .should('be.visible');

            //     // Prevent afterEach from deleting the student again.
            //     createdStudentId = null;

            // DELETE

            cy.intercept('DELETE', `${API_URL}/students/${studentId}`)
                .as('deleteStudent');

            cy.on('window:confirm', () => true);

            cy.get(
                `button[aria-label="Delete UpdatedStudent ${studentId}"]`
            )
                .should('be.visible')
                .click();

            cy.wait('@deleteStudent').then((interception) => {

                cy.log(`DELETE status: ${interception.response?.statusCode}`);

                cy.log(`Deleted student ID: ${studentId}`);

                expect(interception.response).to.exist;

                expect(interception.response!.statusCode)
                    .to.be.oneOf([200, 204]);

            });

            // Check the real database through the API.
            cy.request({
                method: 'GET',
                url: `${API_URL}/students`,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }).then((response) => {

                expect(response.status).to.equal(200);

                const deletedStudent = response.body.find(
                    (item: any) => item.id === studentId
                );

                expect(deletedStudent).to.be.undefined;

            });

            cy.contains('UpdatedStudent TestStudent')
                .should('not.exist');

            cy.contains('Student deleted successfully.')
                .should('be.visible');

            // Prevent afterEach from deleting the student again.
            createdStudentId = null;
        });

    });


    // VALIDATION
    it('should reject invalid student information', () => {

        cy.get('#firstName').type('John');
        cy.get('#lastName').type('Doe');
        cy.get('#email').type('not-an-email');
        cy.get('#age').type('0');

        cy.contains('button', 'Create').click();

        cy.contains('Please enter a valid email address.')
            .should('be.visible');

        cy.contains('Age must be at least 1.')
            .should('be.visible');

    });


    // LOGOUT
    it('should logout and prevent access to students', () => {

        cy.contains('button', 'Logout').click();

        cy.url().should('include', '/login');

        cy.window().its('localStorage.token')
            .should('not.exist');

        // Try accessing the protected page again.
        cy.visit('/students');

        cy.url().should('include', '/login');

    });

});
