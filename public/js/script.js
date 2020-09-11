if($("#searchInput").length!==0)
{
    var searchItems = JSON.parse($("#searchInput").attr("data-item"));
    var currentUser = $("#searchInput").attr("data-user"); 
    var searchBar   = $("#search");
    var itemContainer = $("#displayItems");
   /*  searchBar.keypress((e)=>{
        const searchString = e.target.value;
        let filterItem   = searchItems.filter(item=>{
            return(item.name.includes(searchString) || item.category.includes(searchString) || item.description.includes(searchString));
        });
        if(searchString.length === 0)
        {
            itemContainer.html('');
            filterItem = [];
            
        }
        else
        {
            displayItems(filterItem);
        }
    }); */
    document.getElementById("search").addEventListener('input',(e)=>{
        const searchString = e.target.value;
        let filterItem   = searchItems.filter(item=>{
            return(item.name.includes(searchString) || item.category.includes(searchString) || item.description.includes(searchString));
        });
        if(searchString.length === 0)
        {
            itemContainer.html('');
            filterItem = [];
            
        }
        else
        {
            displayItems(filterItem);
        }
    })
    function displayItems(items){
        const htmlString = items.map((item)=>{
            var image = item.image;
            var title = item.name;
            var type = item.category;
            return `
            <div class="row">
                <div class="col s12">
                    <div class="card black-text">
                    <div class="card-content" style="color:black;">
                        <div class="card-image">
                        <img src="${image}" class="responsive-image" style="width: 200px;height: 100px;margin:auto" alt="">
                        </div>
                        <div class="card-title">
                        <a style="color:black;" href="/customer/${currentUser}/products/${type}">${title}</a>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
            `
        }).join('');
        itemContainer.html(htmlString);
    }
}
