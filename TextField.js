class TextField {

    constructor({label = "", maxLength=12, placeholder="", showCharCount=true, 
                forceUpperCase=false, value="", className="", onSubmit=()=>{}}={}) {
        this.label = label;
        this.maxLength = maxLength;
        this.placeholder = placeholder;
        this.showCharCount = showCharCount;
        this.forceUpperCase = forceUpperCase;
        this.value = value;
        this.className = className;
        this.onSubmit = onSubmit;
    };

    charactersLeft() {
        return this.showCharCount ? this.maxLength - this.value.length : "";
    }

    handleChange = (event) => {
        let text = $(event.target).val()
        text = this.collapseSpaces(text);

        while(text.charAt(0) == ' ' || text.charAt(0) == '\t') {
            text = text.substr(1)
        }
        if (text.length > this.maxLength && this.maxLength !== -1) {
            text = text.substr(0, this.maxLength);
        }
        if (this.forceUpperCase) {
            text = text.toUpperCase();
        }

        this.value = text;
        event.target.value = this.value
        let charLeft = this.charactersLeft()
        $(event.target).siblings().find('#charLeft').text(charLeft)
    }

    collapseSpaces(text) {
        return text.replace(/\s\s+/g, ' ');
    }

    render() {
        // const html = $(`
        //     <div>
        //         <form>
        //             <div style="display: flex; width: calc(10px + 40vmin); flexDirection: row; margin-left: auto; margin-right: auto;">
        //                 <p>${this.label}</p>
        //                 <p id="charLeft">${this.charactersLeft()}</p>
        //             </div>
        //             <input class="TextField ${this.className}" 
        //                 value="${this.value}" 
        //                 placeholder="${this.placeholder}"
        //                 autocomplete="off"
        //             </input>
        //         </form>
        //     </div>
        // `);
        const html = $(`
            <div>
                <form>
                    <div>
                        <p>${this.label}</p>
                        <p id="charLeft">${this.charactersLeft()}</p>
                    </div>
                    <input class="TextField ${this.className}" 
                        value="${this.value}" 
                        placeholder="${this.placeholder}"
                        autocomplete="off"
                    </input>
                </form>
            </div>
        `);

        const input = html.find('input');
        input.on('input', this.handleChange)
        const form = html.find('form');
        form.on('submit', (e) => {
            e.preventDefault();
        })

        return html
    }

}

export default TextField;