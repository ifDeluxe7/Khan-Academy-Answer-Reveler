(function () {
    'use strict';
    let isLoaded = false;

    class AnswerData {
        constructor(content, category) {
            this.content = content;
            this.category = category;
        }

        get isMultipleChoice() {
            return this.category === "multiple_choice";
        }

        get isFreeText() {
            return this.category === "free_response";
        }

        get isMathExpression() {
            return this.category === "expression";
        }

        get isDropdown() {
            return this.category === "dropdown";
        }

        displayAnswer() {
            const { content } = this;
            const styling = "color: coral; -webkit-text-stroke: .5px black; font-size:24px; font-weight:bold;";

            content.forEach((answer, idx) => {
                if (typeof answer === "string") {
                    if (answer.includes("web+graphie")) {
                        this.content[idx] = "";
                        this.renderImage(answer);
                    } else {
                        content[idx] = answer.replaceAll("$", "");
                    }
                }
            });

            const formattedText = content.join("\n").trim();
            if (formattedText) {
                console.log(`%c${formattedText}`, styling);
            }
        }

        renderImage(answer) {
            const url = answer.replace("![](web+graphie", "https").replace(")", ".svg");
            const imageElement = new Image();

            imageElement.src = url;
            imageElement.onload = () => {
                const imageStyle = [
                    'font-size: 1px;',
                    `line-height: ${this.height % 2}px;`,
                    `padding: ${this.height * 0.5}px ${this.width * 0.5}px;`,
                    `background-size: ${this.width}px ${this.height}px;`,
                    `background: url(${url});`
                ].join(' ');
                console.log('%c ', imageStyle);
            };
        }
    }

    const originalFetch = window.fetch;
    window.fetch = function () {
        return originalFetch.apply(this, arguments).then(async (response) => {
            if (response.url.includes("/getAssessmentItem")) {
                const clonedResponse = response.clone();
                const jsonData = await clonedResponse.json();

                let assessmentItem, questionDetails;

                try {
                    assessmentItem = jsonData.data.assessmentItem.item.itemData;
                    questionDetails = JSON.parse(assessmentItem).question;
                } catch {
                    let getErrorIteration = () => localStorage.getItem("error_iter") || 0;
                    localStorage.setItem("error_iter", getErrorIteration() + 1);

                    if (getErrorIteration() < 4) {
                        return location.reload();
                    } else {
                        return console.error("%cAn error occurred", "color: red; font-weight: bolder; font-size: 20px;");
                    }
                }

                if (!questionDetails) return;

                Object.keys(questionDetails.widgets).forEach(widgetName => {
                    const widgetType = widgetName.split(" ")[0];

                    if (widgetType === "numeric-input" || widgetType === "input-number") {
                        return createFreeResponseAnswer(questionDetails).displayAnswer();
                    } else if (widgetType === "radio") {
                        return createMultipleChoiceAnswer(questionDetails).displayAnswer();
                    } else if (widgetType === "expression") {
                        return createExpressionAnswer(questionDetails).displayAnswer();
                    } else if (widgetType === "dropdown") {
                        return createDropdownAnswer(questionDetails).displayAnswer();
                    }
                });
            }

            if (!isLoaded) {
                console.clear();
                
                console.log("%cMade by [ ifDeluxe7 ]", "color: white; -webkit-text-stroke: .5px black; font-size:15px; font-weight:bold;");
                isLoaded = true;
            }

            return response;
        });
    };

    function createFreeResponseAnswer(question) {
        const answers = Object.values(question.widgets)
            .map(widget => {
                if (widget.options?.answers) {
                    return widget.options.answers.map(ans => {
                        if (ans.status === "correct") {
                            return ans.value;
                        }
                    });
                } else if (widget.options?.inexact === false) {
                    return widget.options.value;
                }
            })
            .flat()
            .filter(Boolean);

        return new AnswerData(answers, "free_response");
    }

    function createMultipleChoiceAnswer(question) {
        const answers = Object.values(question.widgets)
            .map(widget => {
                if (widget.options?.choices) {
                    return widget.options.choices.map(choice => {
                        if (choice.correct) {
                            return choice.content;
                        }
                    });
                }
            })
            .flat()
            .filter(Boolean);

        return new AnswerData(answers, "multiple_choice");
    }

    function createExpressionAnswer(question) {
        const answers = Object.values(question.widgets)
            .map(widget => {
                if (widget.options?.answerForms) {
                    return widget.options.answerForms.map(answer => {
                        if (Object.values(answer).includes("correct")) {
                            return answer.value;
                        }
                    });
                }
            })
            .flat();

        return new AnswerData(answers, "expression");
    }

    function createDropdownAnswer(question) {
        const answers = Object.values(question.widgets)
            .map(widget => {
                if (widget.options?.choices) {
                    return widget.options.choices.map(choice => {
                        if (choice.correct) {
                            return choice.content;
                        }
                    });
                }
            })
            .flat();

        return new AnswerData(answers, "dropdown");
    }
})();
